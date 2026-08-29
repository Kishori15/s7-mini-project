from __future__ import annotations

import pandas as pd

from backend.services.insight_context_service import (
    MAX_REPRESENTATIVE_REVIEW_CHARS,
    REPRESENTATIVE_REVIEWS_PER_SENTIMENT,
    build_insight_context,
)


def test_build_insight_context_is_bounded_sentiment_aware_and_redacts_samples() -> None:
    frame = pd.DataFrame([
        {"review_text": "Battery life is excellent. Contact me at name@example.com", "sentiment": "Positive", "rating": 5, "category": "Phones"},
        {"review_text": "Excellent battery performance and bright display", "sentiment": "Positive", "rating": 5, "category": "Phones"},
        {"review_text": "Camera quality is poor. Call 987-654-3210", "sentiment": "Negative", "rating": 1, "category": "Phones"},
        {"review_text": "The camera is poor in low light", "sentiment": "Negative", "rating": 2, "category": "Phones"},
        {"review_text": "The phone is acceptable for daily use", "sentiment": "Neutral", "rating": 3, "category": "Phones"},
    ])

    context = build_insight_context(frame, {"category": "category"})

    assert context["review_count"] == 5
    assert context["average_rating"] == 3.2
    assert context["sentiment_counts"] == {"Positive": 2, "Negative": 2, "Neutral": 1}
    assert context["sentiment_percentages"] == {"Positive": 40.0, "Negative": 40.0, "Neutral": 20.0}
    assert context["themes"]["battery"] == {"positive": 2}
    assert context["themes"]["camera"] == {"negative": 2}
    assert context["top_categories"] == {"Phones": 5}
    samples = context["representative_reviews"]
    assert all(len(items) <= REPRESENTATIVE_REVIEWS_PER_SENTIMENT for items in samples.values())
    assert all(len(item) <= MAX_REPRESENTATIVE_REVIEW_CHARS for items in samples.values() for item in items)
    assert "name@example.com" not in " ".join(samples["positive"])
    assert "987-654-3210" not in " ".join(samples["negative"])


def test_build_insight_context_supports_text_only_datasets() -> None:
    frame = pd.DataFrame([
        {"review_text": "Battery life is excellent", "sentiment": "Positive"},
        {"review_text": "Camera quality is poor", "sentiment": "Negative"},
    ])

    context = build_insight_context(frame, {})

    assert "average_rating" not in context
    assert context["sentiment_counts"] == {"Positive": 1, "Negative": 1, "Neutral": 0}
    assert context["representative_reviews"]["positive"] == ["Battery life is excellent"]
    assert context["representative_reviews"]["negative"] == ["Camera quality is poor"]
