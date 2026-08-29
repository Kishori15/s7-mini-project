from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any, Sequence


class SentimentServiceError(RuntimeError):
    """Raised when local sentiment inference cannot complete."""


class SentimentDependencyError(SentimentServiceError):
    """Raised when PyTorch or Transformers is unavailable."""


@dataclass(frozen=True)
class SentimentModelInfo:
    model_name: str
    device: str
    batch_size: int
    neutral_threshold: float


class SentimentService:
    """Reusable local DistilBERT sentiment inference service."""

    MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        batch_size: int | None = None,
        neutral_threshold: float | None = None,
        max_length: int | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self.model_name = model_name
        self.batch_size = self._positive_int(batch_size or os.getenv("SENTIMENT_BATCH_SIZE"), 8)
        self.neutral_threshold = self._bounded_float(
            neutral_threshold if neutral_threshold is not None else os.getenv("SENTIMENT_NEUTRAL_THRESHOLD"),
            0.60,
        )
        # DistilBERT supports at most 512 tokens. Keep configuration from
        # accidentally requesting an unsupported (and memory-hungry) length.
        self.max_length = min(self._positive_int(max_length or os.getenv("SENTIMENT_MAX_LENGTH"), 512), 512)
        self.logger = logger or logging.getLogger("sentiment_service")
        self._torch: Any | None = None
        self._tokenizer: Any | None = None
        self._model: Any | None = None
        self._device = "cpu"

    @staticmethod
    def _positive_int(value: int | str | None, default: int) -> int:
        try:
            return max(1, int(value)) if value is not None else default
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _bounded_float(value: float | str | None, default: float) -> float:
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return default
        return parsed if 0.5 <= parsed < 1 else default

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return
        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
        except ImportError as exc:
            raise SentimentDependencyError(
                "Local sentiment analysis requires the torch and transformers packages. "
                "Install the project requirements and restart the application."
            ) from exc

        self._torch = torch
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger.info("Loading local sentiment model %s on %s.", self.model_name, self._device.upper())
        try:
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
            self._model.to(self._device)
            self._model.eval()
        except Exception as exc:
            self._tokenizer = None
            self._model = None
            raise SentimentServiceError(
                "Could not load the local DistilBERT model. Check the network on the first run or the local Hugging Face cache."
            ) from exc
        self.logger.info("Local sentiment model loaded successfully on %s.", self._device.upper())

    @property
    def model_info(self) -> SentimentModelInfo:
        return SentimentModelInfo(
            model_name=self.model_name,
            device=self._device.upper(),
            batch_size=self.batch_size,
            neutral_threshold=self.neutral_threshold,
        )

    @staticmethod
    def _is_cuda_oom(exc: RuntimeError) -> bool:
        message = str(exc).lower()
        return "cuda" in message and "out of memory" in message

    @staticmethod
    def _clean_text(value: object) -> str | None:
        if not isinstance(value, str):
            return None
        text = value.strip()
        return text or None

    def _predict_batch(self, texts: Sequence[str]) -> list[tuple[str, float]]:
        if not texts:
            return []
        assert self._torch is not None and self._tokenizer is not None and self._model is not None
        encoded = self._tokenizer(
            list(texts),
            padding=True,
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
        )
        encoded = {name: tensor.to(self._device) for name, tensor in encoded.items()}
        with self._torch.inference_mode():
            logits = self._model(**encoded).logits
            probabilities = self._torch.softmax(logits, dim=-1).detach().cpu()
        predictions: list[tuple[str, float]] = []
        for scores in probabilities:
            index = int(self._torch.argmax(scores).item())
            confidence = float(scores[index].item())
            label = self._model.config.id2label[index].upper()
            if confidence < self.neutral_threshold:
                label = "NEUTRAL"
            predictions.append((label.title(), confidence))
        return predictions

    def _fall_back_to_cpu(self) -> None:
        assert self._model is not None and self._torch is not None
        if self._device == "cpu":
            return
        self.logger.warning("CUDA inference exhausted available memory; falling back to CPU.")
        self._model.to("cpu")
        self._device = "cpu"
        self._torch.cuda.empty_cache()

    def _predict_with_recovery(self, texts: Sequence[str]) -> list[tuple[str, float]]:
        batch_size = min(self.batch_size, len(texts))
        while True:
            try:
                return self._predict_in_chunks(texts, batch_size)
            except RuntimeError as exc:
                if not self._is_cuda_oom(exc):
                    raise SentimentServiceError("Local DistilBERT inference failed.") from exc
                if batch_size > 1:
                    batch_size = max(1, batch_size // 2)
                    self.logger.warning("CUDA out of memory; retrying with batch size %s.", batch_size)
                    assert self._torch is not None
                    self._torch.cuda.empty_cache()
                    continue
                if self._device == "cuda":
                    self._fall_back_to_cpu()
                    batch_size = min(self.batch_size, len(texts))
                    continue
                raise SentimentServiceError("Local sentiment inference ran out of memory on CPU.") from exc

    def _predict_in_chunks(self, texts: Sequence[str], batch_size: int) -> list[tuple[str, float]]:
        predictions: list[tuple[str, float]] = []
        for start in range(0, len(texts), batch_size):
            predictions.extend(self._predict_batch(texts[start : start + batch_size]))
        return predictions

    def analyze_reviews(self, records: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        """Return local sentiment and confidence for every supplied review ID."""
        if not records:
            return []
        review_ids = [str(record.get("review_id", "")) for record in records]
        if any(not review_id for review_id in review_ids) or len(review_ids) != len(set(review_ids)):
            raise SentimentServiceError("Local sentiment analysis requires unique, non-empty review IDs.")

        valid_positions: list[int] = []
        valid_texts: list[str] = []
        results = [
            {"review_id": review_id, "sentiment": "Unknown", "sentiment_confidence": None}
            for review_id in review_ids
        ]
        for position, record in enumerate(records):
            text = self._clean_text(record.get("review_text", record.get("review")))
            if text is not None:
                valid_positions.append(position)
                valid_texts.append(text)
        if not valid_texts:
            return results

        self._ensure_loaded()
        self.logger.info(
            "Processing %s reviews locally with batch size %s on %s.",
            len(valid_texts), self.batch_size, self._device.upper(),
        )
        predictions = self._predict_with_recovery(valid_texts)
        for position, (sentiment, confidence) in zip(valid_positions, predictions, strict=True):
            results[position] = {
                "review_id": review_ids[position],
                "sentiment": sentiment,
                "sentiment_confidence": round(confidence, 4),
            }
        self.logger.info("Local sentiment analysis completed for %s reviews.", len(valid_texts))
        return results


_service: SentimentService | None = None


def get_sentiment_service() -> SentimentService:
    """Return the process-wide lazy model service instance."""
    global _service
    if _service is None:
        _service = SentimentService()
    return _service
