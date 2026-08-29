from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from collections import deque
from pathlib import Path
from threading import Lock
from typing import Any, Iterable, Sequence

from dotenv import load_dotenv

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - runtime dependency is optional until installed
    genai = None
    types = None


class GeminiServiceError(Exception):
    """Base exception for Gemini integration failures."""


class GeminiConfigurationError(GeminiServiceError):
    """Raised when the Gemini API key or runtime configuration is invalid."""


class GeminiRequestError(GeminiServiceError):
    """Raised when a Gemini request fails even after retries."""


class GeminiResponseValidationError(GeminiServiceError):
    """Raised when a Gemini response is malformed or incomplete."""


class GeminiQuotaExceededError(GeminiServiceError):
    """Raised when the API reports a quota or rate-limit problem."""

    def __init__(self, message: str, cached_results: Sequence[dict[str, Any]] | None = None) -> None:
        super().__init__(message)
        self.cached_results = list(cached_results or [])


class GeminiService:
    """Batch-process customer reviews through Google Gemini with validation and caching."""

    REQUIRED_FIELDS = {
        "review_id",
        "sentiment",
    }
    ALLOWED_SENTIMENTS = {"Positive", "Neutral", "Negative"}
    _request_timestamps: deque[float] = deque()
    _request_lock = Lock()

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str = "gemini-3.6-flash",
        batch_size: int = 10,
        max_retries: int = 3,
        cache_path: str | Path | None = None,
        dataset_hash: str | None = None,
        requests_per_minute: int | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        load_dotenv()

        resolved_api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        if not resolved_api_key:
            raise GeminiConfigurationError(
                "GEMINI_API_KEY is missing. Configure it in the project .env file."
            )

        self.api_key = resolved_api_key.strip()
        self.model_name = model_name
        configured_batch_size = os.getenv("GEMINI_BATCH_SIZE")
        self.batch_size = self._positive_int(configured_batch_size, batch_size)
        self.max_retries = max(1, max_retries)
        self.requests_per_minute = self._positive_int(
            os.getenv("GEMINI_REQUESTS_PER_MINUTE"), requests_per_minute or 5
        )
        self.dataset_hash = dataset_hash
        if cache_path is None and not dataset_hash:
            raise GeminiConfigurationError("A dataset hash is required for Gemini cache isolation.")
        self.cache_path = Path(cache_path) if cache_path else Path("data/cache") / dataset_hash / "gemini_cache.json"
        try:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise GeminiServiceError("Could not create the current dataset's Gemini cache directory.") from exc
        self.metadata_path = self.cache_path.parent / "metadata.json"
        self.logger = logger or self._configure_logger()
        self._cache: dict[str, dict[str, Any]] = self._load_cache()
        self._save_metadata()

        if genai is None:
            raise GeminiConfigurationError(
                "google-genai is required but is not installed in the environment."
            )

        self.client = genai.Client(api_key=self.api_key)

    @staticmethod
    def _positive_int(value: str | int | None, default: int) -> int:
        try:
            return max(1, int(value)) if value is not None else default
        except (TypeError, ValueError):
            return default

    def _configure_logger(self) -> logging.Logger:
        logs_dir = Path("logs")
        logs_dir.mkdir(parents=True, exist_ok=True)

        logger = logging.getLogger("gemini_service")
        logger.setLevel(logging.INFO)
        logger.propagate = False

        if not logger.handlers:
            formatter = logging.Formatter(
                "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )

            file_handler = logging.FileHandler(
                logs_dir / "gemini_service.log",
                encoding="utf-8",
            )
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)

            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(formatter)
            logger.addHandler(stream_handler)

        return logger

    def _load_cache(self) -> dict[str, dict[str, Any]]:
        if not self.cache_path.exists():
            return {}

        try:
            with self.cache_path.open("r", encoding="utf-8") as cache_file:
                data = json.load(cache_file)
        except (OSError, json.JSONDecodeError):
            self.logger.warning("Cache file is corrupted. Resetting the cache.")
            return {}

        if not isinstance(data, dict):
            return {}

        return data

    def _save_cache(self) -> None:
        try:
            with self.cache_path.open("w", encoding="utf-8") as cache_file:
                json.dump(self._cache, cache_file, indent=2)
        except OSError as exc:
            raise GeminiServiceError("Could not write the current dataset's Gemini cache.") from exc

    def _save_metadata(self) -> None:
        if not self.dataset_hash:
            return
        try:
            with self.metadata_path.open("w", encoding="utf-8") as metadata_file:
                json.dump({"dataset_hash": self.dataset_hash}, metadata_file, indent=2)
        except OSError as exc:
            raise GeminiServiceError("Could not write cache metadata for the current dataset.") from exc

    def _build_cache_key(self, review_text: str) -> str:
        normalized_text = " ".join(str(review_text).strip().split())
        return hashlib.sha256(normalized_text.encode("utf-8")).hexdigest()

    def _build_dashboard_cache_key(
        self, record: dict[str, Any], requested: Sequence[str]
    ) -> str:
        cache_input = {
            "review_id": str(record.get("review_id", "")),
            "review_text": record.get("review_text") or record.get("review") or "",
            "requested": list(requested),
        }
        return "dashboard:" + hashlib.sha256(
            json.dumps(cache_input, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

    def _build_insight_cache_key(self, context: dict[str, Any]) -> str:
        """Build a stable key for an overall dashboard insight."""
        cache_input = {"context": context}
        return "insight:" + hashlib.sha256(
            json.dumps(cache_input, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

    @staticmethod
    def _is_rate_limit_error(exc: Exception) -> bool:
        message = str(exc).lower()
        return any(marker in message for marker in ("429", "rate limit", "quota", "resource exhausted", "too many requests"))

    def _wait_for_request_slot(self) -> None:
        """Apply one process-wide, configurable request-per-minute limit."""
        while True:
            with self._request_lock:
                now = time.monotonic()
                while self._request_timestamps and now - self._request_timestamps[0] >= 60:
                    self._request_timestamps.popleft()
                if len(self._request_timestamps) < self.requests_per_minute:
                    self._request_timestamps.append(now)
                    return
                wait_seconds = 60 - (now - self._request_timestamps[0])
            self.logger.info("Gemini application rate limit reached; waiting %.1f seconds.", wait_seconds)
            time.sleep(max(wait_seconds, 0.1))

    def _generate_content_with_retry(self, prompt: str, config: Any) -> Any:
        for attempt in range(1, self.max_retries + 1):
            try:
                self._wait_for_request_slot()
                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config,
                )
            except Exception as exc:
                if self._is_rate_limit_error(exc):
                    raise GeminiQuotaExceededError("Gemini rate limit or quota was reached.") from exc
                message = str(exc).lower()
                retryable = any(
                    marker in message
                    for marker in ("503", "unavailable", "timed out", "timeout", "429", "rate limit")
                )
                if not retryable or attempt >= self.max_retries:
                    raise GeminiRequestError(str(exc)) from exc
                self.logger.warning(
                    "Transient Gemini error on attempt %s/%s: %s",
                    attempt,
                    self.max_retries,
                    exc,
                )
                time.sleep(3 * attempt)
        raise GeminiRequestError("Gemini request failed after retries.")

    def _call_gemini_with_retry(self, prompt: str) -> list[dict[str, Any]]:
        for attempt in range(1, self.max_retries + 1):
            try:
                return self._call_gemini(prompt)
            except GeminiQuotaExceededError:
                raise
            except GeminiRequestError as exc:
                message = str(exc).lower()
                retryable = any(
                    marker in message
                    for marker in ("503", "unavailable", "timed out", "timeout")
                )
                if not retryable or attempt >= self.max_retries:
                    raise
                self.logger.warning(
                    "Transient Gemini error on attempt %s/%s: %s",
                    attempt,
                    self.max_retries,
                    exc,
                )
                time.sleep(3 * attempt)
            except Exception as exc:
                if self._is_rate_limit_error(exc):
                    raise GeminiQuotaExceededError("Gemini rate limit or quota was reached.") from exc
                message = str(exc).lower()
                retryable = any(
                    marker in message
                    for marker in ("503", "unavailable", "timed out", "timeout", "429", "rate limit")
                )
                if not retryable or attempt >= self.max_retries:
                    raise GeminiRequestError(str(exc)) from exc
                self.logger.warning(
                    "Transient Gemini error on attempt %s/%s: %s",
                    attempt,
                    self.max_retries,
                    exc,
                )
                time.sleep(3 * attempt)
        raise GeminiRequestError("Gemini request failed after retries.")

    def _build_prompt(self, batch: Sequence[dict[str, Any]]) -> str:
        prompt_lines = [
            "You are an expert customer feedback analyst.",
            "Analyze the following reviews.",
            "Return ONLY valid JSON.",
            "For every review return exactly these fields:",
            "review_id",
            "sentiment",
            "Do not include markdown.",
            "Do not include explanations.",
            "Do not omit any review.",
            "",
            "Input reviews:",
        ]

        for review in batch:
            review_id = review.get("review_id")
            review_text = review.get("review_text") or review.get("review") or ""
            prompt_lines.append(json.dumps({"review_id": review_id, "review": review_text}))

        return "\n".join(prompt_lines)

    def _call_gemini(self, prompt: str) -> list[dict[str, Any]]:
        self.logger.info("API request started.")

        if types is None:
            raise GeminiConfigurationError(
                "google-genai is not available for Gemini API calls."
            )

        config = types.GenerateContentConfig(
            temperature=0.2,
            top_p=0.9,
            top_k=40,
            max_output_tokens=4096,
            response_mime_type="application/json",
        )

        self._wait_for_request_slot()
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config,
            )
        except Exception as exc:
            if self._is_rate_limit_error(exc):
                raise GeminiQuotaExceededError("Gemini rate limit or quota was reached.") from exc
            raise GeminiRequestError(str(exc)) from exc

        response_text = getattr(response, "text", None)
        if not response_text:
            raise GeminiRequestError("Gemini returned an empty response body.")

        cleaned_text = response_text.strip()
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text.strip("`")
            if cleaned_text.lower().startswith("json"):
                cleaned_text = cleaned_text[4:].lstrip()

        try:
            payload = json.loads(cleaned_text)
        except json.JSONDecodeError as exc:
            raise GeminiResponseValidationError(
                "Gemini returned malformed JSON and validation failed."
            ) from exc

        if not isinstance(payload, list):
            raise GeminiResponseValidationError(
                "Gemini response must be a JSON array of review objects."
            )

        return payload

    def _validate_payload(
        self,
        payload: list[dict[str, Any]],
        input_batch: Sequence[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        input_ids = {
            str(item.get("review_id"))
            for item in input_batch
            if item.get("review_id") is not None
        }

        seen_review_ids: set[str] = set()
        validated_results: list[dict[str, Any]] = []

        for item in payload:
            if not isinstance(item, dict):
                raise GeminiResponseValidationError("Each response item must be an object.")

            missing_fields = self.REQUIRED_FIELDS.difference(item.keys())
            if missing_fields:
                raise GeminiResponseValidationError(
                    "Missing required Gemini fields: " + ", ".join(sorted(missing_fields))
                )

            review_id = item.get("review_id")
            review_id = str(review_id)
            if review_id not in input_ids:
                raise GeminiResponseValidationError(
                    f"Unexpected review_id returned by Gemini: {review_id}"
                )

            if review_id in seen_review_ids:
                raise GeminiResponseValidationError(
                    f"Duplicate review_id returned by Gemini: {review_id}"
                )
            seen_review_ids.add(review_id)

            sentiment = str(item.get("sentiment", "")).strip()
            if sentiment not in self.ALLOWED_SENTIMENTS:
                raise GeminiResponseValidationError(
                    f"Invalid sentiment value: {sentiment}. "
                    f"Expected one of {sorted(self.ALLOWED_SENTIMENTS)}"
                )

            validated_results.append(
                {
                    "review_id": review_id,
                    "sentiment": sentiment,
                }
            )

        if len(validated_results) != len(input_batch):
            raise GeminiResponseValidationError(
                "Gemini returned a different number of rows than the input batch."
            )

        return validated_results

    def _chunked(self, items: Sequence[dict[str, Any]]) -> Iterable[list[dict[str, Any]]]:
        for start in range(0, len(items), self.batch_size):
            yield list(items[start : start + self.batch_size])

    def _find_review_text(self, batch: Sequence[dict[str, Any]], review_id: str) -> str:
        for review in batch:
            if str(review.get("review_id")) == review_id:
                return str(review.get("review_text") or review.get("review") or "")
        return ""

    def analyze_reviews(self, reviews: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        """Analyze a sequence of reviews in Gemini batches and return enriched records."""

        if not reviews:
            return []

        results: list[dict[str, Any]] = []

        for batch_index, batch in enumerate(self._chunked(reviews), start=1):
            self.logger.info("Processing batch %s with %s reviews.", batch_index, len(batch))

            cached_results: list[dict[str, Any]] = []
            pending_batch: list[dict[str, Any]] = []

            for review in batch:
                review_text = str(review.get("review_text") or review.get("review") or "")
                cache_key = self._build_cache_key(review_text)
                cached_response = self._cache.get(cache_key)

                if cached_response:
                    self.logger.info(
                        "Cache hit for review_id=%s.",
                        review.get("review_id"),
                    )
                    cached_results.append(
                        {**cached_response, "review_id": review.get("review_id")}
                    )
                else:
                    pending_batch.append(review)

            if pending_batch:
                prompt = self._build_prompt(pending_batch)
                attempt = 0

                while attempt < self.max_retries:
                    attempt += 1
                    try:
                        payload = self._call_gemini(prompt)
                        validated = self._validate_payload(payload, pending_batch)

                        for item in validated:
                            review_text = self._find_review_text(pending_batch, item["review_id"])
                            cache_key = self._build_cache_key(review_text)
                            self._cache[cache_key] = item
                            self.logger.info(
                                "Cache miss recorded for review_id=%s.",
                                item["review_id"],
                            )

                        results.extend(validated)
                        self._save_cache()
                        self.logger.info(
                            "Validation success for batch %s on attempt %s.",
                            batch_index,
                            attempt,
                        )
                        break
                    except (GeminiRequestError, GeminiResponseValidationError) as exc:
                        self.logger.warning(
                            "Retry attempt %s failed for batch %s: %s",
                            attempt,
                            batch_index,
                            exc,
                        )
                        if attempt >= self.max_retries:
                            raise GeminiRequestError(
                                f"Gemini processing failed after {self.max_retries} attempts for batch {batch_index}"
                            ) from exc
                        time.sleep(3 * attempt)
                    except Exception as exc:
                        if "quota" in str(exc).lower() or "rate limit" in str(exc).lower():
                            raise GeminiQuotaExceededError(
                                "Gemini quota has been exceeded. Save progress and retry later."
                            ) from exc
                        raise GeminiRequestError(str(exc)) from exc
            else:
                results.extend(cached_results)

            self.logger.info("Batch %s completed.", batch_index)
            time.sleep(3)

        return results

    def enrich_dashboard_data(
        self,
        records: Sequence[dict[str, Any]],
        infer_fields: set[str],
    ) -> list[dict[str, Any]]:
        """Return sentiment and only the requested blank dimension values.

        This is deliberately separate from the legacy full-review analyzer: the
        dashboard does not request complaint summaries, priority, or keywords.
        """
        if not records:
            return []
        review_ids = [str(record.get("review_id")) for record in records]
        if len(review_ids) != len(set(review_ids)):
            raise GeminiResponseValidationError("Duplicate review IDs are not supported for Gemini analysis.")
        result: list[dict[str, Any]] = []
        requested = ["sentiment", *sorted(infer_fields.intersection({"brand", "product_name", "category"}))]
        for batch in self._chunked(records):
            cached_items: dict[str, dict[str, Any]] = {}
            pending_batch: list[dict[str, Any]] = []
            cache_keys = {}
            for record in batch:
                review_id = str(record["review_id"])
                cache_key = self._build_dashboard_cache_key(record, requested)
                cache_keys[review_id] = cache_key
                cached = self._cache.get(cache_key)
                if isinstance(cached, dict) and all(field in cached for field in ["review_id", *requested]):
                    cached_items[review_id] = cached
                else:
                    pending_batch.append(record)

            compact_pending_batch = [
                {
                    "review_id": record["review_id"],
                    "review_text": record.get("review_text") or record.get("review") or "",
                }
                for record in pending_batch
            ]
            prompt = (
    "You are an AI customer-feedback analyst. "
    "Analyze the customer reviews provided below and return ONLY a valid JSON array. "

    "For every input record, return the original review_id and these fields: "
    + ", ".join(requested) + ". "

    "The sentiment field must be exactly one of: Positive, Neutral, or Negative. "
    "Determine the sentiment strictly from the review text. "
    "Positive means the customer expresses overall satisfaction or praise. "
    "Negative means the customer expresses dissatisfaction, complaints, or problems. "
    "Neutral means the review is factual, mixed without a clear overall direction, "
    "or does not express a clearly positive or negative opinion. "

    "For any other requested dimension, infer a value only when the review provides "
    "clear and reliable evidence. If the review does not provide enough information, "
    "return null. "

    "Do not overwrite any value that is already supplied in the input record. "
    "Do not invent information or make unsupported assumptions. "
    "Do not summarize individual reviews. "
    "Do not add explanations, comments, markdown, code fences, or extra fields. "
    "Return exactly one JSON object for every input record and preserve the original review_id. "

    "Input records:\n"
    + "\n".join(json.dumps(record, default=str) for record in compact_pending_batch)
)
            try:
                payload = self._call_gemini_with_retry(prompt) if pending_batch else []
            except GeminiQuotaExceededError as exc:
                self._save_cache()
                raise GeminiQuotaExceededError(
                    str(exc), self._cached_dashboard_results(records, requested)
                ) from exc
            if len(payload) != len(pending_batch):
                raise GeminiResponseValidationError("Gemini returned a different number of rows than the input batch.")
            fresh_items: dict[str, dict[str, Any]] = {}
            expected_batch_ids = {str(record["review_id"]) for record in pending_batch}
            for item in payload:
                if not isinstance(item, dict) or str(item.get("review_id")) not in expected_batch_ids:
                    raise GeminiResponseValidationError("Gemini returned an unexpected review identifier.")
                sentiment = str(item.get("sentiment", "")).strip()
                if sentiment not in self.ALLOWED_SENTIMENTS:
                    raise GeminiResponseValidationError("Gemini returned an invalid sentiment value.")
                clean_item = {field: item.get(field) for field in ["review_id", *requested]}
                review_id = str(item["review_id"])
                if review_id in fresh_items:
                    raise GeminiResponseValidationError("Gemini returned a duplicate review identifier.")
                fresh_items[review_id] = clean_item
                self._cache[cache_keys[review_id]] = clean_item
            for record in batch:
                review_id = str(record["review_id"])
                # Do not use ``dict.get(key, cached_items[key])`` here. Python
                # evaluates the default argument before calling ``get``, which
                # raises a KeyError for freshly generated (non-cached) records.
                if review_id in fresh_items:
                    result.append(fresh_items[review_id])
                elif review_id in cached_items:
                    result.append(cached_items[review_id])
                else:
                    raise GeminiResponseValidationError(
                        f"Gemini did not return analysis for review_id={review_id}."
                    )
            self._save_cache()
        if len(result) != len(records):
            raise GeminiResponseValidationError("Gemini returned a different number of rows than the input.")
        return result

    def _cached_dashboard_results(
        self, records: Sequence[dict[str, Any]], requested: Sequence[str]
    ) -> list[dict[str, Any]]:
        """Return only cached enrichment owned by this service's current file namespace."""
        cached_results: list[dict[str, Any]] = []
        required_fields = ["review_id", *requested]
        for record in records:
            cache_key = self._build_dashboard_cache_key(record, requested)
            cached = self._cache.get(cache_key)
            if isinstance(cached, dict) and all(field in cached for field in required_fields):
                cached_results.append(cached)
        return cached_results

    def generate_product_insight(self, context: dict[str, Any]) -> str:
        """Create and cache one concise insight from aggregated dashboard data."""
        cache_key = self._build_insight_cache_key(context)
        cached = self._cache.get(cache_key)
        if isinstance(cached, dict) and isinstance(cached.get("insight"), str):
            self.logger.info("Cache hit for overall product insight.")
            return cached["insight"]

        prompt = (
            "You are advising a product developer. Use only the supplied JSON evidence. Distinguish observed evidence "
            "from interpretation and do not invent facts. Write concise plain-text bullets covering: overall signal; "
            "what customers like; what customers dislike or recurring problems; improvement opportunities; and "
            "actionable recommendations. Refer to supplied themes or representative reviews when relevant. Do not claim "
            "a theme is widespread unless its supplied count supports that conclusion. "
            "Dashboard summary:\n" + json.dumps(context, default=str)
        )
        response = self._generate_content_with_retry(
            prompt,
            types.GenerateContentConfig(temperature=0.2, max_output_tokens=700),
        )
        if not getattr(response, "text", None):
            raise GeminiRequestError("Gemini returned an empty executive insight.")
        insight = response.text.strip()
        self._cache[cache_key] = {"insight": insight}
        self._save_cache()
        self.logger.info("Cache miss recorded for overall product insight.")
        return insight

