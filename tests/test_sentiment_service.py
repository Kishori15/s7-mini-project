from __future__ import annotations

import os

import pytest

from backend.services.sentiment_service import SentimentService, SentimentServiceError


def test_empty_reviews_are_unknown_without_loading_a_model() -> None:
    service = SentimentService()
    assert service.analyze_reviews([
        {"review_id": "1", "review_text": ""},
        {"review_id": "2", "review_text": None},
    ]) == [
        {"review_id": "1", "sentiment": "Unknown", "sentiment_confidence": None},
        {"review_id": "2", "sentiment": "Unknown", "sentiment_confidence": None},
    ]


def test_batch_results_include_confidence_and_neutral_calibration(monkeypatch: pytest.MonkeyPatch) -> None:
    service = SentimentService(neutral_threshold=0.60)
    monkeypatch.setattr(service, "_ensure_loaded", lambda: None)
    monkeypatch.setattr(
        service,
        "_predict_with_recovery",
        lambda _texts: [("Positive", 0.9821), ("Neutral", 0.5512), ("Negative", 0.9784)],
    )

    result = service.analyze_reviews([
        {"review_id": "1", "review_text": "Excellent product"},
        {"review_id": "2", "review_text": "It is okay"},
        {"review_id": "3", "review_text": "Terrible quality"},
    ])

    assert result == [
        {"review_id": "1", "sentiment": "Positive", "sentiment_confidence": 0.9821},
        {"review_id": "2", "sentiment": "Neutral", "sentiment_confidence": 0.5512},
        {"review_id": "3", "sentiment": "Negative", "sentiment_confidence": 0.9784},
    ]


def test_duplicate_review_ids_are_rejected() -> None:
    service = SentimentService()
    with pytest.raises(SentimentServiceError, match="unique"):
        service.analyze_reviews([
            {"review_id": "1", "review_text": "Good"},
            {"review_id": "1", "review_text": "Bad"},
        ])


def test_non_string_and_long_reviews_are_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    service = SentimentService(max_length=999)
    assert service.max_length == 512
    monkeypatch.setattr(service, "_ensure_loaded", lambda: None)
    captured: list[str] = []
    monkeypatch.setattr(
        service,
        "_predict_with_recovery",
        lambda texts: (captured.extend(texts) or [("Positive", 0.9)]),
    )

    result = service.analyze_reviews([
        {"review_id": "1", "review_text": 123},
        {"review_id": "2", "review_text": "x" * 20_000},
    ])

    assert result[0] == {"review_id": "1", "sentiment": "Unknown", "sentiment_confidence": None}
    assert result[1] == {"review_id": "2", "sentiment": "Positive", "sentiment_confidence": 0.9}
    assert captured == ["x" * 20_000]


@pytest.mark.skipif(
    os.getenv("RUN_LOCAL_MODEL_TESTS") != "1",
    reason="Set RUN_LOCAL_MODEL_TESTS=1 to run the downloaded local model test.",
)
def test_local_model_classifies_known_positive_and_negative_reviews() -> None:
    """Manual integration check; it may download the model on its first run."""
    service = SentimentService(batch_size=2)
    results = service.analyze_reviews([
        {"review_id": "positive", "review_text": "This product is excellent and I really love it."},
        {"review_id": "negative", "review_text": "This product is terrible and completely useless."},
    ])

    assert [result["sentiment"] for result in results] == ["Positive", "Negative"]
    assert all(isinstance(result["sentiment_confidence"], float) for result in results)
