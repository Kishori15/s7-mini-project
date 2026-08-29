from __future__ import annotations

from types import SimpleNamespace

import pandas as pd

from backend import api


def test_insight_automatically_uses_local_distilbert_before_gemini(monkeypatch) -> None:
    processed = pd.DataFrame([
        {"review_id": "1", "review_text": "Excellent battery life", "rating": 5},
        {"review_id": "2", "review_text": "Camera quality is poor", "rating": 1},
    ])
    session = api.DatasetSession(
        filename="feedback.csv",
        file_size=1,
        content_hash="dataset-a",
        raw=processed.copy(),
        mapping={"review_text": "review_text", "rating": "rating"},
        processed=processed,
    )
    local_calls = 0
    captured_context: dict = {}

    class FakeSentimentService:
        model_info = SimpleNamespace(device="CPU")

        def analyze_reviews(self, records):
            nonlocal local_calls
            local_calls += 1
            assert [record["review_text"] for record in records] == ["Excellent battery life", "Camera quality is poor"]
            return [
                {"review_id": "1", "sentiment": "Positive", "sentiment_confidence": 0.99},
                {"review_id": "2", "sentiment": "Negative", "sentiment_confidence": 0.98},
            ]

    class FakeGeminiService:
        def __init__(self, *, dataset_hash: str):
            assert dataset_hash == "dataset-a"

        def generate_product_insight(self, context: dict) -> str:
            captured_context.update(context)
            return "Evidence-based insight"

    monkeypatch.setattr(api, "get_sentiment_service", lambda: FakeSentimentService())
    monkeypatch.setattr(api, "GeminiService", FakeGeminiService)
    monkeypatch.setattr(api, "_session_or_404", lambda _dataset_id: session)

    result = api.generate_insight("dataset-id")

    assert result["insight"] == "Evidence-based insight"
    assert local_calls == 1
    assert session.sentiment_provider == "distilbert"
    assert captured_context["sentiment_counts"] == {"Positive": 1, "Negative": 1, "Neutral": 0}
    assert captured_context["representative_reviews"]["positive"] == ["Excellent battery life"]
