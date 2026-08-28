from __future__ import annotations

import re

import pandas as pd


REQUIRED_FIELD = "review_text"
STANDARD_FIELDS = ("review_id", "review_text", "rating", "review_date", "product_name", "brand", "category", "sentiment")
FIELD_LABELS = {"review_id": "Review ID", "review_text": "Feedback / review text", "rating": "Rating", "review_date": "Review date", "product_name": "Product", "brand": "Brand", "category": "Category", "sentiment": "Sentiment"}
ALIASES = {
    "review_id": {"reviewid", "id", "feedbackid", "recordid", "responseid", "submissionid", "uuid", "ticketid"},
    "review_text": {"reviewtext", "review", "comment", "feedback", "customerreview", "text", "message", "description", "remarks", "notes", "reviewbody", "content"},
    "rating": {"rating", "stars", "score", "reviewrating", "starrating", "starsrating", "satisfactionscore", "scorevalue"},
    "review_date": {"reviewdate", "date", "createdat", "submittedon", "timestamp", "createddate", "submitteddate", "posteddate", "reviewtime"},
    "product_name": {"productname", "product", "item", "producttitle", "itemname", "service", "servicename"},
    "brand": {"brand", "company", "manufacturer", "vendor", "seller", "companyname", "store", "organisation", "organization"},
    "category": {"category", "productcategory", "type", "segment", "department", "producttype", "servicecategory", "group"},
    "sentiment": {"sentiment", "opinion", "polarity", "sentimentlabel", "reviewsentiment"},
}


def normalize_header(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def detect_columns(columns: list[str]) -> dict[str, str | None]:
    normalized = {normalize_header(column): column for column in columns}
    return {field: next((normalized[name] for name in ALIASES[field] if name in normalized), None) for field in STANDARD_FIELDS}


def prepare_dataset(raw_df: pd.DataFrame, mapping: dict[str, str | None]) -> pd.DataFrame:
    if not mapping.get(REQUIRED_FIELD):
        raise ValueError("Select a column containing feedback or review text to continue.")
    data = {field: raw_df[source] for field, source in mapping.items() if source and source in raw_df.columns}
    df = pd.DataFrame(data).copy()
    df["review_text"] = df["review_text"].fillna("").astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
    df = df[df["review_text"].ne("")].copy()
    if df.empty:
        raise ValueError("No usable feedback rows remain after blank feedback is removed.")
    if "review_id" not in df:
        df["review_id"] = [f"review-{index + 1}" for index in range(len(df))]
    else:
        blank = df["review_id"].isna() | df["review_id"].astype(str).str.strip().eq("")
        df.loc[blank, "review_id"] = [f"review-{index + 1}" for index in df.index[blank]]
        df["review_id"] = df["review_id"].astype(str)
    if "rating" in df:
        df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
        df.loc[~df["rating"].between(1, 5), "rating"] = pd.NA
    if "review_date" in df:
        df["review_date"] = pd.to_datetime(df["review_date"], errors="coerce")
    for field, fallback in (("product_name", "Unknown Product"), ("brand", "Unknown Brand"), ("category", "Uncategorized")):
        if field in df:
            blank = df[field].isna() | df[field].astype(str).str.strip().eq("")
            df.loc[blank, field] = fallback
            df[field] = df[field].astype(str).str.strip()
    return df.reset_index(drop=True)


def available_capabilities(df: pd.DataFrame, mapped_fields: set[str]) -> list[str]:
    capabilities = ["Feedback explorer"]
    if "rating" in mapped_fields and df["rating"].notna().any(): capabilities.append("Rating distribution and average rating")
    if "review_date" in mapped_fields and df["review_date"].notna().any(): capabilities.append("Monthly review trend")
    if "product_name" in mapped_fields: capabilities.append("Product comparison")
    if "brand" in mapped_fields: capabilities.append("Brand comparison")
    if "category" in mapped_fields: capabilities.append("Category breakdown")
    if "sentiment" in mapped_fields or "rating" in mapped_fields: capabilities.append("Sentiment analysis")
    return capabilities
