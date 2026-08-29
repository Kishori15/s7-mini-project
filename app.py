from __future__ import annotations

import hashlib
import io
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from backend.services.dataset_service import (
    FIELD_LABELS,
    REQUIRED_FIELD,
    STANDARD_FIELDS,
    available_capabilities,
    detect_columns,
    prepare_dataset,
)
from backend.services.gemini_service import (
    GeminiQuotaExceededError,
    GeminiService,
    GeminiServiceError,
)
from backend.services.insight_context_service import build_insight_context
from backend.services.sentiment_service import SentimentServiceError, get_sentiment_service


st.set_page_config(page_title="Feedback Analytics", layout="wide")


def _reset_for_upload(file_bytes: bytes) -> None:
    signature = hashlib.sha256(file_bytes).hexdigest()
    if st.session_state.get("upload_signature") != signature:
        for key in ("dataset", "mapping", "ai_dataset", "ai_insight", "ai_warning", "ai_ready", "sentiment_model_status", "sentiment_provider"):
            st.session_state.pop(key, None)
        for field in STANDARD_FIELDS:
            st.session_state.pop(f"map_{field}", None)
        st.session_state.upload_signature = signature
    st.session_state.dataset_hash = signature


def _sentiment_from_rating(rating: object) -> str | None:
    if pd.isna(rating):
        return None
    return "Positive" if rating >= 4 else "Negative" if rating <= 2 else "Neutral"


def _normalise_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    result = df.copy()
    if "sentiment" in result:
        result["sentiment"] = result["sentiment"].astype(str).str.strip().str.title()
        result.loc[~result["sentiment"].isin(["Positive", "Neutral", "Negative"]), "sentiment"] = pd.NA
    if "rating" in result:
        derived = result["rating"].apply(_sentiment_from_rating)
        if "sentiment" not in result:
            result["sentiment"] = derived
        else:
            result["sentiment"] = result["sentiment"].fillna(derived)
    return result


def _render_mapping(raw_df: pd.DataFrame) -> None:
    suggestions = detect_columns(raw_df.columns.tolist())
    choices = ["— Not available —", *raw_df.columns.tolist()]
    st.subheader("Confirm your column mapping")
    st.caption("We matched common header names automatically. Review the selections before processing.")
    with st.form("mapping_form"):
        mapping: dict[str, str | None] = {}
        columns = st.columns(2)
        for index, field in enumerate(STANDARD_FIELDS):
            suggested = suggestions.get(field)
            default = choices.index(suggested) if suggested in choices else 0
            selected = columns[index % 2].selectbox(
                f"{FIELD_LABELS[field]}{' *' if field == REQUIRED_FIELD else ''}", choices, index=default, key=f"map_{field}"
            )
            mapping[field] = None if selected == choices[0] else selected
        submitted = st.form_submit_button("Process dataset", type="primary")
    if submitted:
        try:
            st.session_state.dataset = _normalise_sentiment(prepare_dataset(raw_df, mapping))
            st.session_state.mapping = mapping
            st.session_state.ai_dataset = None
            st.session_state.ai_insight = None
            st.session_state.sentiment_provider = None
            st.session_state.sentiment_model_status = None
            st.rerun()
        except ValueError as exc:
            st.error(str(exc))


def _render_capabilities(df: pd.DataFrame, mapping: dict[str, str | None]) -> None:
    fields = {field for field, source in mapping.items() if source}
    st.success("Available: " + ", ".join(available_capabilities(df, fields)))
    unavailable = [FIELD_LABELS[field] for field in ("rating", "review_date", "product_name", "brand", "category") if not mapping.get(field)]
    if unavailable:
        st.info("Not included in this upload: " + ", ".join(unavailable) + ". Dependent charts are hidden.")


def _render_dashboard(df: pd.DataFrame, mapping: dict[str, str | None]) -> None:
    st.subheader("Dashboard")
    mapped = {field for field, source in mapping.items() if source}
    kpis = st.columns(5)
    kpis[0].metric("Feedback items", len(df))
    if "rating" in mapped and df["rating"].notna().any():
        kpis[1].metric("Average rating", f"{df['rating'].mean():.2f}")
    if "sentiment" in df and df["sentiment"].notna().any():
        kpis[2].metric("Positive feedback", int((df["sentiment"] == "Positive").sum()))
        kpis[3].metric("Negative feedback", int((df["sentiment"] == "Negative").sum()))
    if "product_name" in mapped:
        kpis[4].metric("Products", int(df["product_name"].nunique()))

    if "sentiment" in df and df["sentiment"].notna().any():
        counts = df.dropna(subset=["sentiment"]).groupby("sentiment").size().reset_index(name="Reviews")
        st.plotly_chart(px.pie(counts, names="sentiment", values="Reviews", title="Sentiment distribution"), use_container_width=True)
    if "rating" in mapped and df["rating"].notna().any():
        ratings = df.dropna(subset=["rating"]).groupby("rating").size().reset_index(name="Reviews")
        st.plotly_chart(px.bar(ratings, x="rating", y="Reviews", title="Rating distribution"), use_container_width=True)
    if "review_date" in mapped and df["review_date"].notna().any():
        monthly = df.dropna(subset=["review_date"]).assign(month=lambda x: x["review_date"].dt.to_period("M").astype(str)).groupby("month").size().reset_index(name="Reviews")
        st.plotly_chart(px.line(monthly, x="month", y="Reviews", title="Monthly feedback trend"), use_container_width=True)
    for field, title in (("product_name", "Feedback by product"), ("brand", "Feedback by brand"), ("category", "Feedback by category")):
        if field in mapped:
            grouped = df.groupby(field).size().reset_index(name="Reviews").sort_values("Reviews", ascending=False).head(20)
            st.plotly_chart(px.bar(grouped, x=field, y="Reviews", title=title), use_container_width=True)
    st.subheader("Processed feedback")
    st.dataframe(df, use_container_width=True, hide_index=True)


def _ai_context(df: pd.DataFrame, mapping: dict[str, str | None]) -> dict:
    return build_insight_context(df, mapping)


def _merge_ai_results(
    df: pd.DataFrame, enriched: list[dict], mapping: dict[str, str | None]
) -> pd.DataFrame:
    fallbacks = {"product_name": "Unknown Product", "brand": "Unknown Brand", "category": "Uncategorized"}
    result = df.copy()
    additions = pd.DataFrame(enriched)
    if additions.empty:
        return _normalise_sentiment(result)
    result = result.merge(additions, on="review_id", how="left", suffixes=("", "_ai"))
    for field, fallback in fallbacks.items():
        if f"{field}_ai" in result:
            result[field] = result[field].mask(result[field].eq(fallback), result[f"{field}_ai"]).fillna(result[field])
            result = result.drop(columns=f"{field}_ai")
    result["sentiment"] = result.get("sentiment_ai", result.get("sentiment")).fillna(result.get("sentiment"))
    result = result.drop(columns=[column for column in result if column.endswith("_ai")])
    return _normalise_sentiment(result)


def _run_gemini_sentiment(df: pd.DataFrame, mapping: dict[str, str | None]) -> None:
    infer_fields = set()
    fallbacks = {"product_name": "Unknown Product", "brand": "Unknown Brand", "category": "Uncategorized"}
    for field, fallback in fallbacks.items():
        if mapping.get(field) and df[field].eq(fallback).any():
            infer_fields.add(field)
    records = df[[column for column in ["review_id", "review_text", "rating", "product_name", "brand", "category"] if column in df]].to_dict("records")
    service = GeminiService(dataset_hash=st.session_state.dataset_hash)
    try:
        enriched = service.enrich_dashboard_data(records, infer_fields)
        st.session_state.ai_warning = None
        st.session_state.ai_ready = True
    except GeminiQuotaExceededError as exc:
        enriched = exc.cached_results
        st.session_state.ai_ready = bool(enriched)
        st.session_state.ai_warning = (
            "Gemini rate limit reached. Showing the latest cached analysis."
            if enriched
            else "Gemini rate limit reached and no cached analysis is available for this dataset. Please try again later."
        )
    st.session_state.ai_dataset = _merge_ai_results(df, enriched, mapping)
    st.session_state.sentiment_provider = "gemini"


def _run_distilbert_sentiment(df: pd.DataFrame, mapping: dict[str, str | None]) -> None:
    """Run local DistilBERT inference for the uploaded reviews."""
    records = df[[column for column in ["review_id", "review_text"] if column in df]].to_dict("records")
    service = get_sentiment_service()
    additions = service.analyze_reviews(records)
    st.session_state.ai_dataset = _merge_ai_results(df, additions, mapping)
    st.session_state.ai_warning = None
    # Gemini's aggregate insight can use locally generated sentiment, but it
    # remains a separate feature and does not participate in classification.
    st.session_state.ai_ready = True
    st.session_state.sentiment_provider = "distilbert"
    model = service.model_info
    st.session_state.sentiment_model_status = (
        f"Local DistilBERT | Device: {model.device} | Batch size: {model.batch_size}"
    )


def _run_ai_insight(df: pd.DataFrame, mapping: dict[str, str | None]) -> None:
    if st.session_state.get("sentiment_provider") != "distilbert":
        _run_distilbert_sentiment(st.session_state.dataset, mapping)
        df = st.session_state.ai_dataset
    service = GeminiService(dataset_hash=st.session_state.dataset_hash)
    try:
        st.session_state.ai_insight = service.generate_product_insight(_ai_context(df, mapping))
        st.session_state.ai_warning = None
    except GeminiQuotaExceededError:
        st.session_state.ai_warning = (
            "Gemini rate limit reached and no cached AI insight is available for this dataset. Please try again later."
        )


def main() -> None:
    st.title("Customer Feedback Analytics")
    st.caption("Upload the data you have; the dashboard only shows insights that data can support.")
    uploaded = st.file_uploader("Upload a CSV", type=["csv"])
    if uploaded is None:
        st.info("Upload a CSV file to begin. A feedback/review-text column is required.")
        return
    file_bytes = uploaded.getvalue()
    _reset_for_upload(file_bytes)
    try:
        raw_df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig")
    except Exception as exc:
        st.error(f"The CSV could not be read: {exc}")
        return
    if raw_df.empty:
        st.error("The CSV contains no rows.")
        return
    if "dataset" not in st.session_state:
        _render_mapping(raw_df)
        return
    df = st.session_state.ai_dataset if st.session_state.get("ai_dataset") is not None else st.session_state.dataset
    mapping = st.session_state.mapping
    _render_capabilities(df, mapping)
    st.subheader("Sentiment analysis")
    st.caption("Choose local DistilBERT or Gemini. Both options remain independent for comparison.")
    local_button, gemini_button = st.columns(2)
    if local_button.button("Analyze with Local DistilBERT", type="primary"):
        try:
            with st.spinner("Analyzing feedback locally with DistilBERT..."):
                _run_distilbert_sentiment(st.session_state.dataset, mapping)
            st.rerun()
        except SentimentServiceError as exc:
            st.warning(f"Local DistilBERT analysis was unavailable: {exc}. The dashboard remains available.")
        except Exception as exc:
            st.warning(f"Local DistilBERT analysis was unavailable: {exc}. The dashboard remains available.")
    if gemini_button.button("Analyze with Gemini"):
        try:
            with st.spinner("Analyzing feedback with Gemini..."):
                _run_gemini_sentiment(st.session_state.dataset, mapping)
            st.session_state.sentiment_model_status = "Gemini"
            st.rerun()
        except GeminiServiceError as exc:
            st.warning(f"Gemini analysis was unavailable: {exc}. The dashboard remains available.")
        except Exception as exc:
            st.warning(f"Gemini analysis was unavailable: {exc}. The dashboard remains available.")
    if st.session_state.get("sentiment_model_status"):
        st.caption(f"Sentiment source: {st.session_state.sentiment_model_status}")
    if st.session_state.get("ai_warning"):
        st.warning(st.session_state.ai_warning)
    if st.button("Generate AI Insight", disabled=not st.session_state.get("ai_ready", False)):
        try:
            with st.spinner("Generating an overall AI insight..."):
                _run_ai_insight(st.session_state.ai_dataset, mapping)
            st.rerun()
        except SentimentServiceError as exc:
            st.warning(f"Local DistilBERT analysis was unavailable: {exc}. The dashboard remains available.")
        except GeminiServiceError as exc:
            st.warning(f"AI insight was unavailable: {exc}. The non-AI dashboard remains available.")
    if st.session_state.get("ai_insight"):
        st.subheader("AI product-developer insight")
        st.markdown(st.session_state.ai_insight)
    _render_dashboard(df, mapping)


if __name__ == "__main__":
    main()
