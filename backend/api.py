from __future__ import annotations

import hashlib
import io
import os
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal
from uuid import uuid4

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.services.analytics_service import get_sentiment_distribution
from backend.services.dataset_service import (
    FIELD_LABELS,
    REQUIRED_FIELD,
    STANDARD_FIELDS,
    detect_columns,
    prepare_dataset,
)
from backend.services.gemini_service import GeminiQuotaExceededError, GeminiService, GeminiServiceError
from backend.services.insight_context_service import build_insight_context
from backend.services.sentiment_service import SentimentServiceError, get_sentiment_service


class ProcessRequest(BaseModel):
    mapping: dict[str, str | None] = Field(default_factory=dict)


class SentimentRequest(BaseModel):
    provider: Literal["distilbert", "gemini"] = "distilbert"


@dataclass
class DatasetSession:
    filename: str
    file_size: int
    content_hash: str
    raw: pd.DataFrame
    mapping: dict[str, str | None] = field(default_factory=dict)
    processed: pd.DataFrame | None = None
    enriched: pd.DataFrame | None = None
    sentiment_provider: str | None = None
    insight: str | None = None


sessions: dict[str, DatasetSession] = {}


def _allowed_origins() -> list[str]:
    configured = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


app = FastAPI(title="Feedback Management API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _session_or_404(dataset_id: str) -> DatasetSession:
    session = sessions.get(dataset_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Dataset session was not found. Upload the CSV again.")
    return session


def _processed_or_400(session: DatasetSession) -> pd.DataFrame:
    if session.processed is None:
        raise HTTPException(status_code=400, detail="Process and confirm the dataset mapping before using this endpoint.")
    return session.processed


def _json_value(value: Any) -> Any:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value


def _records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {str(column): _json_value(value) for column, value in row.items()}
        for row in frame.to_dict(orient="records")
    ]


def _summary(frame: pd.DataFrame) -> dict[str, Any]:
    numeric_columns = frame.select_dtypes(include="number").columns.tolist()
    return {
        "record_count": int(len(frame)),
        "column_count": int(len(frame.columns)),
        "numeric_columns": numeric_columns,
        "categorical_columns": [column for column in frame.columns if column not in numeric_columns],
        "unique_values": {
            column: int(frame[column].nunique(dropna=True))
            for column in frame.columns
            if column not in numeric_columns
        },
        "numeric_summary": {
            column: {
                "minimum": _json_value(frame[column].min()),
                "maximum": _json_value(frame[column].max()),
                "average": _json_value(frame[column].mean()),
            }
            for column in numeric_columns
            if frame[column].notna().any()
        },
    }


def _sentiment_payload(frame: pd.DataFrame) -> dict[str, Any] | None:
    if "sentiment" in frame.columns:
        sentiment_values = frame["sentiment"].astype("string").str.strip().str.title()
        sentiment_values = sentiment_values[sentiment_values.isin(["Positive", "Neutral", "Negative"])]
        counts = {str(label): int(count) for label, count in sentiment_values.value_counts().items()}
    elif "rating" in frame.columns:
        distribution = get_sentiment_distribution(frame)
        counts = {row["sentiment"]: int(row["count"]) for row in _records(distribution)}
    else:
        return None
    total = sum(counts.values())
    return {
        "counts": counts,
        "percentages": {
            label: round((count / total) * 100, 2) if total else 0
            for label, count in counts.items()
        },
    }


def _dashboard_context(frame: pd.DataFrame, mapping: dict[str, str | None]) -> dict[str, Any]:
    return build_insight_context(frame, mapping)


def _merge_enrichment(frame: pd.DataFrame, additions: list[dict[str, Any]]) -> pd.DataFrame:
    if not additions:
        return frame.copy()
    additions_frame = pd.DataFrame(additions)
    merged = frame.merge(additions_frame, on="review_id", how="left", suffixes=("", "_ai"))
    for column in additions_frame.columns:
        if column == "review_id":
            continue
        ai_column = f"{column}_ai"
        if ai_column not in merged:
            continue
        if column in frame.columns:
            merged[column] = merged[ai_column].combine_first(merged[column])
            merged = merged.drop(columns=ai_column)
        else:
            merged = merged.rename(columns={ai_column: column})
    return merged


def _run_local_sentiment(session: DatasetSession, processed: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    records = processed[
        [column for column in ["review_id", "review_text", "rating", "product_name", "brand", "category"] if column in processed]
    ].to_dict(orient="records")
    try:
        service = get_sentiment_service()
        additions = service.analyze_reviews(records)
    except SentimentServiceError as exc:
        raise HTTPException(status_code=503, detail=f"Local sentiment analysis is unavailable: {exc}") from exc
    session.enriched = _merge_enrichment(processed, additions)
    session.sentiment_provider = "distilbert"
    return session.enriched, service.model_info.__dict__


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/datasets")
async def upload_dataset(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The CSV file is empty.")
    try:
        raw = pd.read_csv(io.BytesIO(content), encoding="utf-8-sig")
    except (UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError) as exc:
        raise HTTPException(status_code=400, detail=f"The CSV could not be read: {exc}") from exc
    if raw.empty:
        raise HTTPException(status_code=400, detail="The CSV contains no rows.")
    if raw.columns.duplicated().any():
        raise HTTPException(status_code=400, detail="The CSV contains duplicate column names.")

    dataset_id = str(uuid4())
    sessions[dataset_id] = DatasetSession(
        filename=file.filename,
        file_size=len(content),
        content_hash=hashlib.sha256(content).hexdigest(),
        raw=raw,
    )
    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "file_size": len(content),
        "columns": raw.columns.tolist(),
        "record_count": int(len(raw)),
        "suggested_mapping": detect_columns(raw.columns.tolist()),
        "required_field": REQUIRED_FIELD,
        "field_labels": FIELD_LABELS,
        "supported_fields": list(STANDARD_FIELDS),
        "preview": _records(raw.head(10)),
    }


@app.post("/api/datasets/{dataset_id}/process")
def process_dataset(dataset_id: str, request: ProcessRequest) -> dict[str, Any]:
    session = _session_or_404(dataset_id)
    invalid_sources = [source for source in request.mapping.values() if source and source not in session.raw.columns]
    if invalid_sources:
        raise HTTPException(status_code=400, detail="The mapping includes columns that are not present in the uploaded CSV.")
    try:
        processed = prepare_dataset(session.raw, request.mapping)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    session.mapping = request.mapping
    session.processed = processed
    session.enriched = None
    session.sentiment_provider = None
    session.insight = None
    return {
        "dataset_id": dataset_id,
        "filename": session.filename,
        "mapping": session.mapping,
        "columns": processed.columns.tolist(),
        "summary": _summary(processed),
        "sentiment": _sentiment_payload(processed),
        "preview": _records(processed.head(10)),
    }


@app.get("/api/datasets/{dataset_id}/analytics")
def get_analytics(
    dataset_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    enriched: bool = False,
) -> dict[str, Any]:
    session = _session_or_404(dataset_id)
    processed = _processed_or_400(session)
    frame = session.enriched if enriched and session.enriched is not None else processed
    start = (page - 1) * page_size
    return {
        "dataset_id": dataset_id,
        "filename": session.filename,
        "columns": frame.columns.tolist(),
        "summary": _summary(frame),
        "sentiment": _sentiment_payload(frame),
        "page": page,
        "page_size": page_size,
        "total_records": int(len(frame)),
        "rows": _records(frame.iloc[start : start + page_size]),
        "has_enriched_data": session.enriched is not None,
    }


@app.post("/api/datasets/{dataset_id}/sentiment")
def analyze_sentiment(dataset_id: str, request: SentimentRequest | None = None) -> dict[str, Any]:
    session = _session_or_404(dataset_id)
    processed = _processed_or_400(session)
    records = processed[
        [column for column in ["review_id", "review_text", "rating", "product_name", "brand", "category"] if column in processed]
    ].to_dict(orient="records")
    provider = request.provider if request is not None else "distilbert"
    warning = None
    if provider == "distilbert":
        enriched, model_info = _run_local_sentiment(session, processed)
    else:
        infer_fields = {
            field
            for field, fallback in (("product_name", "Unknown Product"), ("brand", "Unknown Brand"), ("category", "Uncategorized"))
            if session.mapping.get(field) and field in processed and processed[field].eq(fallback).any()
        }
        try:
            additions = GeminiService(dataset_hash=session.content_hash).enrich_dashboard_data(records, infer_fields)
        except GeminiQuotaExceededError as exc:
            additions = exc.cached_results
            warning = str(exc)
        except GeminiServiceError as exc:
            raise HTTPException(status_code=503, detail=f"Gemini sentiment analysis is unavailable: {exc}") from exc
        session.enriched = _merge_enrichment(processed, additions)
        session.sentiment_provider = "gemini"
        model_info = None

    return {
        "dataset_id": dataset_id,
        "columns": session.enriched.columns.tolist(),
        "summary": _summary(session.enriched),
        "sentiment": _sentiment_payload(session.enriched),
        "preview": _records(session.enriched.head(10)),
        "warning": warning,
        "provider": provider,
        "model": model_info,
    }


@app.post("/api/datasets/{dataset_id}/insight")
def generate_insight(dataset_id: str) -> dict[str, str]:
    session = _session_or_404(dataset_id)
    processed = _processed_or_400(session)
    # Insights always interpret local DistilBERT results. A prior Gemini
    # comparison therefore never becomes the source of aggregate sentiment.
    if session.sentiment_provider != "distilbert" or session.enriched is None:
        _run_local_sentiment(session, processed)
    source = session.enriched
    try:
        session.insight = GeminiService(dataset_hash=session.content_hash).generate_product_insight(
            _dashboard_context(source, session.mapping)
        )
    except GeminiServiceError as exc:
        raise HTTPException(status_code=503, detail=f"AI insight generation is unavailable: {exc}") from exc
    return {"dataset_id": dataset_id, "insight": session.insight}


@app.get("/api/datasets/{dataset_id}/download")
def download_dataset(dataset_id: str) -> StreamingResponse:
    session = _session_or_404(dataset_id)
    frame = session.enriched if session.enriched is not None else _processed_or_400(session)
    payload = frame.to_csv(index=False).encode("utf-8")
    filename = f"{session.filename.rsplit('.', 1)[0]}_processed.csv"
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
