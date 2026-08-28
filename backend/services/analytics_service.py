from __future__ import annotations

import json
from typing import Any

import pandas as pd


class AnalyticsServiceError(Exception):
    """Raised when analytics cannot be computed from the provided dataset."""


class MissingAnalyticsColumnsError(AnalyticsServiceError):
    """Raised when the DataFrame is missing required analytics columns."""


def _require_columns(df: pd.DataFrame, required_columns: list[str]) -> None:
    missing_columns = [column for column in required_columns if column not in df.columns]
    if missing_columns:
        raise MissingAnalyticsColumnsError(
            "Missing required columns for analytics: " + ", ".join(missing_columns)
        )


def _normalize_sentiment_column(df: pd.DataFrame) -> pd.DataFrame:
    working_df = df.copy()
    if "sentiment" not in working_df.columns:
        if "rating" in working_df.columns:
            working_df["sentiment"] = working_df["rating"].apply(
                lambda rating: "Positive" if float(rating) >= 4 else "Negative" if float(rating) <= 2 else "Neutral"
            )
        else:
            raise MissingAnalyticsColumnsError(
                "sentiment is required for analytics and cannot be derived without rating."
            )
    return working_df


def _normalize_keywords(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    if value is None or (not isinstance(value, str) and pd.isna(value)):
        return []

    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []

        try:
            parsed = json.loads(stripped)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            pass

        return [item.strip() for item in stripped.split(",") if item.strip()]

    return [str(value).strip()]


def generate_dashboard_metrics(df: pd.DataFrame) -> dict[str, Any]:
    """Return the key performance indicators required by the dashboard overview.

    Args:
        df: Processed customer feedback DataFrame.

    Returns:
        Dictionary containing core KPI values.
    """

    _require_columns(df, ["rating", "product_name", "brand", "category"])
    working_df = _normalize_sentiment_column(df)

    sentiment_counts = working_df["sentiment"].value_counts()
    total_reviews = int(len(working_df))
    average_rating = float(working_df["rating"].mean()) if total_reviews else 0.0

    return {
        "total_reviews": total_reviews,
        "positive_reviews": int(sentiment_counts.get("Positive", 0)),
        "neutral_reviews": int(sentiment_counts.get("Neutral", 0)),
        "negative_reviews": int(sentiment_counts.get("Negative", 0)),
        "average_rating": round(average_rating, 2),
        "total_products": int(working_df["product_name"].nunique()),
        "total_brands": int(working_df["brand"].nunique()),
        "total_categories": int(working_df["category"].nunique()),
    }


def get_sentiment_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Return sentiment counts for dashboard visualization."""

    _require_columns(df, ["rating"])
    working_df = _normalize_sentiment_column(df)
    return (
        working_df.groupby("sentiment", dropna=False)
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )


def get_rating_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Return rating counts across the dataset."""

    _require_columns(df, ["rating"])
    return (
        df["rating"]
        .astype(int)
        .value_counts()
        .sort_index()
        .rename_axis("rating")
        .reset_index(name="count")
    )


def get_monthly_trends(df: pd.DataFrame) -> pd.DataFrame:
    """Return monthly review counts over time."""

    _require_columns(df, ["review_date"])
    working_df = df.copy()
    working_df["review_date"] = pd.to_datetime(working_df["review_date"], errors="coerce")
    working_df = working_df.dropna(subset=["review_date"])

    return (
        working_df.assign(month=working_df["review_date"].dt.to_period("M"))
        .groupby("month")
        .size()
        .reset_index(name="review_count")
        .sort_values("month")
    )


def get_product_analytics(df: pd.DataFrame) -> pd.DataFrame:
    """Return per-product performance analytics."""

    _require_columns(df, ["review_id", "product_name", "rating"])
    working_df = _normalize_sentiment_column(df)

    return (
        working_df.groupby("product_name")
        .agg(
            review_count=("review_id", "count"),
            average_rating=("rating", "mean"),
            positive_reviews=("sentiment", lambda values: int((values == "Positive").sum())),
            negative_reviews=("sentiment", lambda values: int((values == "Negative").sum())),
            neutral_reviews=("sentiment", lambda values: int((values == "Neutral").sum())),
        )
        .reset_index()
        .sort_values(["review_count", "average_rating"], ascending=[False, False])
    )


def get_brand_analytics(df: pd.DataFrame) -> pd.DataFrame:
    """Return per-brand performance analytics."""

    _require_columns(df, ["review_id", "brand", "rating"])
    working_df = _normalize_sentiment_column(df)

    return (
        working_df.groupby("brand")
        .agg(
            review_count=("review_id", "count"),
            average_rating=("rating", "mean"),
            positive_reviews=("sentiment", lambda values: int((values == "Positive").sum())),
            negative_reviews=("sentiment", lambda values: int((values == "Negative").sum())),
            neutral_reviews=("sentiment", lambda values: int((values == "Neutral").sum())),
        )
        .reset_index()
        .sort_values(["review_count", "average_rating"], ascending=[False, False])
    )


def get_category_analytics(df: pd.DataFrame) -> pd.DataFrame:
    """Return per-category performance analytics."""

    _require_columns(df, ["review_id", "category", "rating"])
    working_df = _normalize_sentiment_column(df)

    return (
        working_df.groupby("category")
        .agg(
            review_count=("review_id", "count"),
            average_rating=("rating", "mean"),
            positive_reviews=("sentiment", lambda values: int((values == "Positive").sum())),
            negative_reviews=("sentiment", lambda values: int((values == "Negative").sum())),
            neutral_reviews=("sentiment", lambda values: int((values == "Neutral").sum())),
        )
        .reset_index()
        .sort_values(["review_count", "average_rating"], ascending=[False, False])
    )


def get_complaint_analytics(df: pd.DataFrame) -> pd.DataFrame:
    """Return complaint category counts for the dashboard complaint analysis page."""

    _require_columns(df, ["complaint_category"])
    return (
        df["complaint_category"]
        .dropna()
        .astype(str)
        .str.strip()
        .value_counts()
        .rename_axis("complaint_category")
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )


def get_keyword_frequency(df: pd.DataFrame) -> pd.DataFrame:
    """Return the most frequent keywords across the cleaned review dataset."""

    _require_columns(df, ["keywords"])
    exploded_keywords: list[str] = []

    for keyword_value in df["keywords"].dropna().tolist():
        exploded_keywords.extend(_normalize_keywords(keyword_value))

    if not exploded_keywords:
        return pd.DataFrame(columns=["keyword", "count"])

    keyword_counts = pd.Series(exploded_keywords).value_counts().reset_index()
    keyword_counts.columns = ["keyword", "count"]
    return keyword_counts.sort_values("count", ascending=False)


def get_rating_recap(df: pd.DataFrame) -> dict[str, Any]:
    """Return a compact summary of rating-related distribution metrics."""

    _require_columns(df, ["rating"])
    rating_distribution = get_rating_distribution(df)
    return {
        "highest_rating": int(rating_distribution["rating"].max()),
        "lowest_rating": int(rating_distribution["rating"].min()),
        "rating_distribution": rating_distribution.to_dict(orient="records"),
    }

