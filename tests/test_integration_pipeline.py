from __future__ import annotations

from pathlib import Path

import pandas as pd

from backend.services.analytics_service import generate_dashboard_metrics
from backend.services.csv_service import load_csv
from backend.services.dataset_service import prepare_dataset
from backend.services.gemini_service import GeminiService
from backend.services.preprocessing import clean_dataset


def test_csv_cleaning_and_analytics_pipeline(tmp_path: Path) -> None:
    """Verify the documented data-processing path runs end-to-end for a valid feedback file."""

    csv_path = tmp_path / "feedback_pipeline.csv"
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
            },
            {
                "review_id": "1",
                "product_name": "Alpha",
                "brand": "Acme",
                "category": "Electronics",
                "rating": 5,
                "review_text": "Excellent product quality.",
                "review_date": "2026-01-15",
            },
            {
                "review_id": "2",
                "product_name": "Beta",
                "brand": "Acme",
                "category": "Electronics",
                "rating": 3,
                "review_text": "Average product quality.",
                "review_date": "2026-01-20",
            },
        ]
    )
    dataset.to_csv(csv_path, index=False)

    raw_df = load_csv(csv_path)
    cleaned_df = clean_dataset(raw_df)
    metrics = generate_dashboard_metrics(cleaned_df)

    assert len(raw_df) == 3
    assert len(cleaned_df) == 2
    assert metrics["total_reviews"] == 2
    assert metrics["average_rating"] == 4.0
    assert metrics["total_products"] == 2
    assert metrics["total_brands"] == 1
    assert metrics["total_categories"] == 1


def test_upload_mapping_and_batched_gemini_enrichment_pipeline(monkeypatch, tmp_path: Path) -> None:
    """Exercise the active upload-to-AI-data path without making a network call."""
    class FakeGenAI:
        class Client:
            def __init__(self, **_kwargs: object) -> None:
                pass

    monkeypatch.setattr("backend.services.gemini_service.genai", FakeGenAI)
    raw = pd.DataFrame(
        {
            "ID": ["r1", "r2"],
            "Review": ["Excellent sound", "Battery drains quickly"],
            "Rating": [5, 1],
            "Product": ["Unknown Product", "Unknown Product"],
        }
    )
    prepared = prepare_dataset(
        raw,
        {"review_id": "ID", "review_text": "Review", "rating": "Rating", "product_name": "Product"},
    )
    service = GeminiService(api_key="test-key", cache_path=tmp_path / "file-a" / "cache.json", batch_size=20)
    prompts: list[str] = []

    def fake_call(prompt: str) -> list[dict[str, str]]:
        prompts.append(prompt)
        return [
            {"review_id": "r1", "sentiment": "Positive", "product_name": "Headphones"},
            {"review_id": "r2", "sentiment": "Negative", "product_name": "Headphones"},
        ]

    monkeypatch.setattr(service, "_call_gemini_with_retry", fake_call)
    results = service.enrich_dashboard_data(prepared.to_dict("records"), {"product_name"})

    assert [item["sentiment"] for item in results] == ["Positive", "Negative"]
    assert len(prompts) == 1
    assert '"rating"' not in prompts[0]
    assert "Excellent sound" in prompts[0]
