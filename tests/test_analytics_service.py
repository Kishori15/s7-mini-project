from __future__ import annotations

import pandas as pd
import pytest

from backend.services.analytics_service import (
    MissingAnalyticsColumnsError,
    generate_dashboard_metrics,
    get_brand_analytics,
    get_category_analytics,
    get_complaint_analytics,
    get_keyword_frequency,
    get_monthly_trends,
    get_product_analytics,
    get_rating_distribution,
    get_rating_recap,
    get_sentiment_distribution,
)


@pytest.fixture
def feedback_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"review_id": "1", "product_name": "Alpha", "brand": "Acme", "category": "Audio", "rating": 5, "review_date": "2026-01-15", "sentiment": "Positive", "complaint_category": "Battery", "keywords": '["battery", "sound"]'},
            {"review_id": "2", "product_name": "Alpha", "brand": "Acme", "category": "Audio", "rating": 2, "review_date": "2026-01-20", "sentiment": "Negative", "complaint_category": "Battery", "keywords": "battery, delivery"},
            {"review_id": "3", "product_name": "Beta", "brand": "Bravo", "category": "Video", "rating": 3, "review_date": "2026-02-01", "sentiment": "Neutral", "complaint_category": "Packaging", "keywords": ["sound"]},
        ]
    )


def test_dashboard_metrics_and_distributions(feedback_df: pd.DataFrame) -> None:
    metrics = generate_dashboard_metrics(feedback_df)

    assert metrics["total_reviews"] == 3
    assert metrics["average_rating"] == 3.33
    assert metrics["positive_reviews"] == metrics["neutral_reviews"] == metrics["negative_reviews"] == 1
    assert get_rating_distribution(feedback_df).to_dict("records") == [
        {"rating": 2, "count": 1}, {"rating": 3, "count": 1}, {"rating": 5, "count": 1}
    ]
    assert get_rating_recap(feedback_df)["highest_rating"] == 5
    assert get_sentiment_distribution(feedback_df)["count"].sum() == 3


def test_grouped_analytics_trends_complaints_and_keywords(feedback_df: pd.DataFrame) -> None:
    assert get_product_analytics(feedback_df).iloc[0]["product_name"] == "Alpha"
    assert get_brand_analytics(feedback_df).shape[0] == 2
    assert get_category_analytics(feedback_df).shape[0] == 2
    assert get_monthly_trends(feedback_df)["review_count"].tolist() == [2, 1]
    assert get_complaint_analytics(feedback_df).iloc[0]["complaint_category"] == "Battery"
    assert get_keyword_frequency(feedback_df).iloc[0].to_dict() == {"keyword": "battery", "count": 2}


def test_analytics_derives_sentiment_from_rating_and_validates_columns(feedback_df: pd.DataFrame) -> None:
    without_sentiment = feedback_df.drop(columns="sentiment")
    assert generate_dashboard_metrics(without_sentiment)["positive_reviews"] == 1

    with pytest.raises(MissingAnalyticsColumnsError):
        generate_dashboard_metrics(feedback_df.drop(columns="rating"))
