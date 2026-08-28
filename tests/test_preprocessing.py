from __future__ import annotations

import pandas as pd
import pytest

from backend.services.preprocessing import PreprocessingError, clean_dataset


def test_clean_dataset_removes_duplicates_missing_rows_and_normalizes_values() -> None:
    raw = pd.DataFrame(
        [
            {"review_id": "1", "rating": 5.4, "review_text": " Great!!  product. ", "review_date": "2026-01-02"},
            {"review_id": "1", "rating": 5.4, "review_text": " Great!!  product. ", "review_date": "2026-01-02"},
            {"review_id": "2", "rating": 0, "review_text": "Poor; delivery", "review_date": "2026-02-03"},
            {"review_id": "3", "rating": 4, "review_text": None, "review_date": "2026-02-03"},
        ]
    )

    result = clean_dataset(raw)

    assert result["review_id"].tolist() == ["1", "2"]
    assert result["rating"].tolist() == [5, 1]
    assert result["review_text"].tolist() == ["Great product", "Poor delivery"]
    assert result["review_date"].tolist() == ["2026-01-02", "2026-02-03"]


@pytest.mark.parametrize("value", [None, [], pd.DataFrame()])
def test_clean_dataset_rejects_non_dataframe_or_empty_input(value: object) -> None:
    with pytest.raises(PreprocessingError):
        clean_dataset(value)  # type: ignore[arg-type]


def test_clean_dataset_rejects_data_when_no_usable_rows_remain() -> None:
    raw = pd.DataFrame([{"review_id": "1", "rating": None, "review_text": "text"}])

    with pytest.raises(PreprocessingError, match="No usable rows"):
        clean_dataset(raw)
