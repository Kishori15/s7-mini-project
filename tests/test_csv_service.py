from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from backend.services.csv_service import (
    FileValidationError,
    InvalidRatingError,
    InvalidSchemaError,
    load_csv,
)


REQUIRED_COLUMNS = [
    "review_id",
    "product_name",
    "brand",
    "category",
    "rating",
    "review_text",
    "review_date",
]


def _write_csv(path: Path, payload: pd.DataFrame) -> None:
    payload.to_csv(path, index=False)


def test_load_csv_returns_dataframe_for_valid_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "valid_feedback.csv"
    dataset = pd.DataFrame(
        [
            {
                "review_id": "1",
                "product_name": "Alpha",
                "brand": "Acme",
                "category": "Electronics",
                "rating": 5,
                "review_text": "Excellent product quality.",
                "review_date": "2026-01-15",
            }
        ]
    )

    _write_csv(csv_path, dataset)

    result = load_csv(csv_path)

    assert isinstance(result, pd.DataFrame)
    assert result.shape == (1, 7)
    assert list(result.columns) == REQUIRED_COLUMNS
    assert result.iloc[0]["rating"] == 5


def test_load_csv_rejects_wrong_extension(tmp_path: Path) -> None:
    bad_path = tmp_path / "feedback.txt"
    bad_path.write_text("not valid", encoding="utf-8")

    with pytest.raises(FileValidationError, match="Invalid file type"):
        load_csv(bad_path)


def test_load_csv_rejects_missing_required_columns(tmp_path: Path) -> None:
    csv_path = tmp_path / "missing_columns.csv"
    dataset = pd.DataFrame(
        [
            {
                "review_id": "1",
                "product_name": "Alpha",
                "brand": "Acme",
                "category": "Electronics",
                "rating": 4,
                "review_text": "Nice product.",
            }
        ]
    )

    _write_csv(csv_path, dataset)

    with pytest.raises(InvalidSchemaError, match="Missing required columns"):
        load_csv(csv_path)


def test_load_csv_rejects_invalid_rating(tmp_path: Path) -> None:
    csv_path = tmp_path / "bad_rating.csv"
    dataset = pd.DataFrame(
        [
            {
                "review_id": "1",
                "product_name": "Alpha",
                "brand": "Acme",
                "category": "Electronics",
                "rating": 7,
                "review_text": "Bad rating value.",
                "review_date": "2026-01-15",
            }
        ]
    )

    _write_csv(csv_path, dataset)

    with pytest.raises(InvalidRatingError, match="Invalid rating values"):
        load_csv(csv_path)

