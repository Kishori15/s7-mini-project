from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

from backend.services.gemini_service import GeminiQuotaExceededError, GeminiService


def test_enrich_dashboard_data_uses_fresh_results_without_cache_keyerror(
    monkeypatch, tmp_path: Path
) -> None:
    """Fresh Gemini results must not attempt a lookup in the empty cache."""
    class FakeGenAI:
        class Client:
            def __init__(self, **_kwargs: object) -> None:
                pass

    monkeypatch.setattr("backend.services.gemini_service.genai", FakeGenAI)

    service = GeminiService(api_key="test-key", cache_path=tmp_path / "cache.json")
    monkeypatch.setattr(
        service,
        "_call_gemini_with_retry",
        lambda _prompt: [{"review_id": "review-1", "sentiment": "Positive"}],
    )

    result = service.enrich_dashboard_data(
        [{"review_id": "review-1", "review_text": "Excellent product"}],
        set(),
    )

    assert result == [{"review_id": "review-1", "sentiment": "Positive"}]


def test_generate_product_insight_reuses_cached_result(monkeypatch, tmp_path: Path) -> None:
    class FakeGenAI:
        class Client:
            def __init__(self, **_kwargs: object) -> None:
                pass

    class FakeTypes:
        class GenerateContentConfig:
            def __init__(self, **_kwargs: object) -> None:
                pass

    monkeypatch.setattr("backend.services.gemini_service.genai", FakeGenAI)
    monkeypatch.setattr("backend.services.gemini_service.types", FakeTypes)
    service = GeminiService(api_key="test-key", cache_path=tmp_path / "cache.json")
    calls = 0

    def fake_generate(*_args: object, **_kwargs: object) -> SimpleNamespace:
        nonlocal calls
        calls += 1
        return SimpleNamespace(text="- Improve battery life")

    monkeypatch.setattr(service, "_generate_content_with_retry", fake_generate)
    context = {"review_count": 1, "sentiment_counts": {"Negative": 1}}
    assert service.generate_product_insight(context) == "- Improve battery life"
    assert service.generate_product_insight(context) == "- Improve battery life"
    assert calls == 1


def test_rate_limit_fallback_returns_only_current_cache(monkeypatch, tmp_path: Path) -> None:
    class FakeGenAI:
        class Client:
            def __init__(self, **_kwargs: object) -> None:
                pass

    monkeypatch.setattr("backend.services.gemini_service.genai", FakeGenAI)
    service = GeminiService(api_key="test-key", cache_path=tmp_path / "dataset-a" / "cache.json")
    records = [
        {"review_id": "review-1", "review_text": "Already analyzed"},
        {"review_id": "review-2", "review_text": "Needs analysis"},
    ]
    first_key = service._build_dashboard_cache_key(records[0], ["sentiment"])
    service._cache[first_key] = {"review_id": "review-1", "sentiment": "Positive"}
    monkeypatch.setattr(
        service,
        "_call_gemini_with_retry",
        lambda _prompt: (_ for _ in ()).throw(GeminiQuotaExceededError("429")),
    )

    with pytest.raises(GeminiQuotaExceededError) as error:
        service.enrich_dashboard_data(records, set())

    assert error.value.cached_results == [{"review_id": "review-1", "sentiment": "Positive"}]
