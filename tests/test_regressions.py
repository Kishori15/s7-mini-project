from __future__ import annotations

from pathlib import Path

from backend.services.gemini_service import GeminiService


class _FakeGenAI:
    class Client:
        def __init__(self, **_kwargs: object) -> None:
            pass


def test_dataset_hash_creates_a_separate_cache_namespace(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr("backend.services.gemini_service.genai", _FakeGenAI)
    monkeypatch.chdir(tmp_path)

    service_a = GeminiService(api_key="test-key", dataset_hash="hash-a")
    service_b = GeminiService(api_key="test-key", dataset_hash="hash-b")

    assert service_a.cache_path == tmp_path / "data" / "cache" / "hash-a" / "gemini_cache.json"
    assert service_b.cache_path == tmp_path / "data" / "cache" / "hash-b" / "gemini_cache.json"
    assert service_a.metadata_path.read_text(encoding="utf-8") != service_b.metadata_path.read_text(encoding="utf-8")


def test_same_review_text_in_different_file_cache_is_not_reused(monkeypatch, tmp_path: Path) -> None:
    """Regression: File B must never read File A's sentiment cache."""
    monkeypatch.setattr("backend.services.gemini_service.genai", _FakeGenAI)
    record = {"review_id": "same-id", "review_text": "Same text"}
    service_a = GeminiService(api_key="test-key", cache_path=tmp_path / "hash-a" / "gemini_cache.json")
    service_b = GeminiService(api_key="test-key", cache_path=tmp_path / "hash-b" / "gemini_cache.json")
    service_a._cache[service_a._build_dashboard_cache_key(record, ["sentiment"])] = {
        "review_id": "same-id", "sentiment": "Positive"
    }
    service_a._save_cache()
    calls = 0

    def fake_call(_prompt: str) -> list[dict[str, str]]:
        nonlocal calls
        calls += 1
        return [{"review_id": "same-id", "sentiment": "Negative"}]

    monkeypatch.setattr(service_b, "_call_gemini_with_retry", fake_call)
    result = service_b.enrich_dashboard_data([record], set())

    assert calls == 1
    assert result == [{"review_id": "same-id", "sentiment": "Negative"}]


def test_unchanged_file_cache_prevents_a_second_gemini_call(monkeypatch, tmp_path: Path) -> None:
    """Regression: an unchanged upload must reuse its own saved sentiment."""
    monkeypatch.setattr("backend.services.gemini_service.genai", _FakeGenAI)
    cache_path = tmp_path / "same-file-hash" / "gemini_cache.json"
    record = {"review_id": "r1", "review_text": "Great product"}
    first_service = GeminiService(api_key="test-key", cache_path=cache_path)
    monkeypatch.setattr(
        first_service,
        "_call_gemini_with_retry",
        lambda _prompt: [{"review_id": "r1", "sentiment": "Positive"}],
    )
    assert first_service.enrich_dashboard_data([record], set())[0]["sentiment"] == "Positive"

    second_service = GeminiService(api_key="test-key", cache_path=cache_path)
    monkeypatch.setattr(
        second_service,
        "_call_gemini_with_retry",
        lambda _prompt: (_ for _ in ()).throw(AssertionError("Gemini must not be called")),
    )
    assert second_service.enrich_dashboard_data([record], set())[0]["sentiment"] == "Positive"
