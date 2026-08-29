from __future__ import annotations

import re
from collections import Counter
from typing import Any

import pandas as pd


REPRESENTATIVE_REVIEWS_PER_SENTIMENT = 5
MAX_REPRESENTATIVE_REVIEW_CHARS = 500
MAX_THEMES = 12

# These high-frequency terms do not help distinguish product strengths or
# weaknesses. Theme extraction intentionally stays local and lightweight.
STOP_WORDS = {
    "about", "after", "again", "also", "always", "and", "any", "are", "bad", "been", "but", "can",
    "could", "did", "does", "for", "from", "get", "good", "great", "had", "has", "have", "here", "how",
    "its", "just", "like", "more", "most", "much", "not", "now", "only", "our", "out", "product", "really",
    "review", "reviews", "that", "the", "their", "them", "then", "there", "these", "they", "this", "too",
    "use", "used", "using", "very", "was", "were", "what", "when", "which", "will", "with", "would", "you",
    "your",
}
SENTIMENT_LABELS = ("Positive", "Negative", "Neutral")
EMAIL_PATTERN = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
PHONE_PATTERN = re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{6,}\d)(?!\w)")
TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z'-]{2,}")


def _clean_review_text(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    text = " ".join(value.split())
    if not text:
        return None
    text = EMAIL_PATTERN.sub("[email removed]", text)
    text = PHONE_PATTERN.sub("[phone removed]", text)
    return text[:MAX_REPRESENTATIVE_REVIEW_CHARS].rstrip()


def _sentiment_series(frame: pd.DataFrame) -> pd.Series:
    if "sentiment" not in frame:
        return pd.Series(pd.NA, index=frame.index, dtype="string")
    values = frame["sentiment"].astype("string").str.strip().str.title()
    return values.where(values.isin(SENTIMENT_LABELS))


def _select_representative_reviews(frame: pd.DataFrame, sentiment: pd.Series) -> dict[str, list[str]]:
    samples: dict[str, list[str]] = {label.lower(): [] for label in SENTIMENT_LABELS}
    if "review_text" not in frame:
        return samples

    for label in SENTIMENT_LABELS:
        candidates: list[tuple[int, str, set[str]]] = []
        seen: set[str] = set()
        for position, value in enumerate(frame.loc[sentiment.eq(label), "review_text"].tolist()):
            text = _clean_review_text(value)
            if text is None:
                continue
            normalized = text.casefold()
            if normalized in seen:
                continue
            seen.add(normalized)
            tokens = set(token.casefold() for token in TOKEN_PATTERN.findall(text) if token.casefold() not in STOP_WORDS)
            candidates.append((position, text, tokens))

        # Prefer useful medium-length reviews, then select reviews that add new
        # vocabulary so a repeated issue does not consume every sample slot.
        candidates.sort(key=lambda item: (abs(len(item[1]) - 240), item[0]))
        selected: list[str] = []
        selected_tokens: set[str] = set()
        remaining = candidates[:]
        while remaining and len(selected) < REPRESENTATIVE_REVIEWS_PER_SENTIMENT:
            best_index = max(
                range(len(remaining)),
                key=lambda index: (
                    len(remaining[index][2] - selected_tokens),
                    -abs(len(remaining[index][1]) - 240),
                    -remaining[index][0],
                ),
            )
            _, text, tokens = remaining.pop(best_index)
            selected.append(text)
            selected_tokens.update(tokens)
        samples[label.lower()] = selected
    return samples


def _sentiment_aware_themes(frame: pd.DataFrame, sentiment: pd.Series) -> dict[str, dict[str, int]]:
    if "review_text" not in frame:
        return {}
    counts: dict[str, Counter[str]] = {label: Counter() for label in SENTIMENT_LABELS}
    for label, value in zip(sentiment.tolist(), frame["review_text"].tolist(), strict=True):
        if label not in counts:
            continue
        text = _clean_review_text(value)
        if text is None:
            continue
        # Count a word at most once per review, so theme counts describe review
        # mentions rather than repeated words in one long comment.
        tokens = {
            token.casefold()
            for token in TOKEN_PATTERN.findall(text)
            if token.casefold() not in STOP_WORDS
        }
        counts[str(label)].update(tokens)

    all_themes = Counter()
    for counter in counts.values():
        all_themes.update(counter)
    result: dict[str, dict[str, int]] = {}
    for theme, _ in all_themes.most_common(MAX_THEMES):
        per_sentiment = {
            label.lower(): int(counts[label][theme])
            for label in SENTIMENT_LABELS
            if counts[label][theme]
        }
        if per_sentiment:
            result[theme] = per_sentiment
    return result


def _top_counts(frame: pd.DataFrame, column: str) -> dict[str, int] | None:
    if column not in frame:
        return None
    values = frame[column].dropna().astype(str).str.strip()
    values = values[values.ne("")]
    return {str(value): int(count) for value, count in values.value_counts().head(5).items()} or None


def build_insight_context(frame: pd.DataFrame, mapping: dict[str, str | None]) -> dict[str, Any]:
    """Build bounded, evidence-based context for one Gemini aggregate insight."""
    context: dict[str, Any] = {"review_count": int(len(frame))}
    if "rating" in frame and frame["rating"].notna().any():
        context["average_rating"] = round(float(frame["rating"].mean()), 2)

    sentiment = _sentiment_series(frame)
    counts = {label: int(sentiment.eq(label).sum()) for label in SENTIMENT_LABELS}
    if any(counts.values()):
        total = sum(counts.values())
        context["sentiment_counts"] = counts
        context["sentiment_percentages"] = {
            label: round((count / total) * 100, 2) if total else 0.0
            for label, count in counts.items()
        }
        context["themes"] = _sentiment_aware_themes(frame, sentiment)
        context["representative_reviews"] = _select_representative_reviews(frame, sentiment)

    for field, context_name in (("product_name", "top_products"), ("brand", "top_brands"), ("category", "top_categories")):
        if mapping.get(field):
            values = _top_counts(frame, field)
            if values:
                context[context_name] = values
    if mapping.get("review_date") and "review_date" in frame and frame["review_date"].notna().any():
        dates = pd.to_datetime(frame["review_date"], errors="coerce").dropna()
        if not dates.empty:
            context["date_range"] = [str(dates.min().date()), str(dates.max().date())]
    return context
