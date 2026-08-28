from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


class ReportGeneratorError(Exception):
    """Raised when a report cannot be generated from the supplied dataset."""


class ReportGenerator:
    """Generate business insights, summaries, and export-ready report data."""

    def __init__(self, output_dir: str | Path | None = None) -> None:
        self.output_dir = Path(output_dir or "data/processed")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _require_columns(self, df: pd.DataFrame, required_columns: list[str]) -> None:
        missing_columns = [column for column in required_columns if column not in df.columns]
        if missing_columns:
            raise ReportGeneratorError(
                "Missing required columns for report generation: " + ", ".join(missing_columns)
            )

    def generate_business_insights(self, df: pd.DataFrame) -> dict[str, Any]:
        """Generate concise business insights based on the processed dataset."""

        self._require_columns(
            df,
            ["product_name", "brand", "category", "rating", "sentiment", "complaint_category"],
        )

        if df.empty:
            raise ReportGeneratorError("Cannot generate business insights from an empty dataset.")

        sentiment_counts = df["sentiment"].value_counts(dropna=False)
        complaint_counts = df["complaint_category"].value_counts(dropna=False)
        top_product = df.groupby("product_name")["rating"].mean().idxmax()
        top_brand = df.groupby("brand")["rating"].mean().idxmax()
        top_category = df.groupby("category")["rating"].mean().idxmax()

        return {
            "total_reviews": int(len(df)),
            "average_rating": round(float(df["rating"].mean()), 2),
            "top_product": str(top_product),
            "top_brand": str(top_brand),
            "top_category": str(top_category),
            "sentiment_distribution": sentiment_counts.to_dict(),
            "top_complaints": complaint_counts.head(5).to_dict(),
            "generated_at": datetime.now().isoformat(timespec="seconds"),
        }

    def generate_ai_summary(self, df: pd.DataFrame) -> str:
        """Generate a plain-language executive summary from the dataset."""

        self._require_columns(df, ["sentiment", "rating", "brand", "product_name"])

        if df.empty:
            raise ReportGeneratorError("Cannot generate a summary from an empty dataset.")

        average_rating = round(float(df["rating"].mean()), 2)
        positive_reviews = int((df["sentiment"] == "Positive").sum())
        negative_reviews = int((df["sentiment"] == "Negative").sum())
        top_brand = df.groupby("brand")["rating"].mean().idxmax()
        top_product = df.groupby("product_name")["rating"].mean().idxmax()

        return (
            f"The dataset contains {len(df)} customer reviews with an average rating of {average_rating}. "
            f"Positive sentiment appears in {positive_reviews} reviews, while negative sentiment appears in {negative_reviews}. "
            f"The highest-rated brand is {top_brand}, and the strongest-performing product is {top_product}."
        )

    def export_processed_csv(self, df: pd.DataFrame, filename: str = "processed_feedback.csv") -> Path:
        """Save the processed dataset to a CSV file in the output directory."""

        if df.empty:
            raise ReportGeneratorError("Cannot export an empty DataFrame.")

        output_path = self.output_dir / filename
        df.to_csv(output_path, index=False)
        return output_path

    def build_report(self, df: pd.DataFrame) -> dict[str, Any]:
        """Build a single structured report dictionary for downstream dashboard use."""

        return {
            "insights": self.generate_business_insights(df),
            "summary": self.generate_ai_summary(df),
        }

