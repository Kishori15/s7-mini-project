from __future__ import annotations

import pandas as pd
import pytest

from backend.services.dataset_service import (
    available_capabilities,
    detect_columns,
    normalize_header,
    prepare_dataset,
)


def test_detect_columns_and_normalize_header() -> None:
    assert normalize_header("Review ID!") == "reviewid"
    detected = detect_columns(["ID", "Customer Review", "Stars", "Created At", "Product", "Company"])
    assert detected["review_id"] == "ID"
    assert detected["review_text"] == "Customer Review"
    assert detected["rating"] == "Stars"
    assert detected["review_date"] == "Created At"


def test_prepare_dataset_creates_ids_and_normalizes_supported_fields() -> None:
    raw = pd.DataFrame(
        {"Feedback": [" First review ", "", "Second review"], "Score": [5, 9, "bad"], "Product": [None, "X", ""]}
    )
    result = prepare_dataset(raw, {"review_text": "Feedback", "rating": "Score", "product_name": "Product"})

    assert result["review_id"].tolist() == ["review-1", "review-2"]
    assert result["rating"].tolist()[0] == 5
    assert pd.isna(result["rating"].iloc[1])
    assert result["product_name"].tolist() == ["Unknown Product", "Unknown Product"]


def test_prepare_dataset_requires_feedback_mapping() -> None:
    with pytest.raises(ValueError, match="feedback"):
        prepare_dataset(pd.DataFrame({"x": ["text"]}), {"review_text": None})


def test_available_capabilities_reflects_available_fields() -> None:
    df = pd.DataFrame({"rating": [4], "review_date": pd.to_datetime(["2026-01-01"])})
    capabilities = available_capabilities(df, {"rating", "review_date"})
    assert "Rating distribution and average rating" in capabilities
    assert "Monthly review trend" in capabilities
    assert "Sentiment analysis" in capabilities
