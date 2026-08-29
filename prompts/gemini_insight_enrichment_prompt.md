# Prompt: Improve Gemini Insight with Review Evidence and Local Enrichment

## Context

I am building a Feedback Management / Customer Review Analytics project.

Current architecture:

```text
CSV
 ↓
Streamlit (currently used only for verification/testing)
 ↓
Backend services
 ├── Python/Pandas → data processing and analytics
 ├── DistilBERT → sentiment analysis
 └── Gemini API → AI insights and recommendations
```

The production frontend will be built later using React. Do NOT rewire or redesign the current Streamlit architecture as part of this task.

### Current AI responsibilities

**DistilBERT:**

* Performs sentiment classification locally.
* Must remain the only model responsible for sentiment analysis.
* Must not be replaced by Gemini.

**Gemini:**

* Generates higher-level insights.
* Identifies what customers like.
* Identifies what customers dislike.
* Identifies areas requiring improvement.
* Generates actionable recommendations.
* Should interpret evidence rather than independently perform the primary sentiment classification.

---

# Current Problem

I inspected the existing Gemini implementation.

The aggregate `Generate AI Insight` functionality currently sends Gemini only high-level information such as:

```json
{
  "review_count": 280,
  "average_rating": 3.8,
  "sentiment_counts": {
    "Positive": 150,
    "Neutral": 55,
    "Negative": 75
  },
  "top_category": {
    "Phones": 200
  },
  "date_range": [
    "2025-01-01",
    "2025-06-30"
  ]
}
```

The current Gemini insight therefore has:

* sentiment counts
* review count
* average rating
* some category/product/brand frequencies
* optional date range

But it does NOT currently receive:

* representative customer review text
* topic/theme summaries
* complaint themes
* positive themes
* negative themes
* sentiment-by-topic information
* representative evidence for its recommendations

Therefore Gemini cannot reliably generate evidence-based statements such as:

> Customers appreciate the battery life and display, while camera quality and advertisements are recurring complaints.

It only knows the aggregate sentiment counts, not the reasons behind them.

---

# Goal

Improve the existing Gemini insight pipeline so that Gemini receives a **small, bounded, evidence-based insight context**.

The context should combine:

1. Existing aggregate analytics.
2. Existing DistilBERT sentiment results.
3. Locally derived themes/topics/keywords where practical.
4. A small representative sample of actual customer reviews.

This should allow Gemini to produce meaningful insights about:

* What customers like.
* What customers dislike.
* What needs improvement.
* Important customer concerns.
* Positive aspects.
* Negative aspects.
* Actionable recommendations.

---

# IMPORTANT: Do Not Send the Entire Dataset to Gemini

Do NOT simply send all customer reviews to Gemini.

The dataset may contain hundreds or thousands of reviews.

Instead, create a bounded insight context locally.

For example, a possible configuration could be:

```text
5 representative positive reviews
5 representative negative reviews
5 representative neutral reviews
```

The exact number should be determined after inspecting the existing architecture.

Do not hardcode unnecessarily large limits.

The purpose is to reduce:

* Gemini token usage
* API quota consumption
* latency
* unnecessary data exposure

while still providing enough evidence for useful insights.

---

# Recommended Insight Context

The final context sent to Gemini should conceptually contain something like:

```json
{
  "review_count": 280,
  "average_rating": 3.8,

  "sentiment_counts": {
    "Positive": 150,
    "Neutral": 55,
    "Negative": 75
  },

  "sentiment_percentages": {
    "Positive": 53.6,
    "Neutral": 19.6,
    "Negative": 26.8
  },

  "top_categories": {
    "Phones": 200
  },

  "themes": {
    "battery": {
      "positive": 38,
      "negative": 5
    },
    "camera": {
      "positive": 12,
      "negative": 27
    },
    "display": {
      "positive": 31,
      "negative": 4
    }
  },

  "representative_reviews": {
    "positive": [
      "Battery life is excellent...",
      "Display is crisp..."
    ],
    "negative": [
      "Front camera is poor...",
      "The advertisements are irritating..."
    ],
    "neutral": [
      "The phone is decent..."
    ]
  }
}
```

This is an illustrative structure only.

Inspect the existing project and adapt it to the project's actual data structures.

Do NOT blindly copy this structure if it conflicts with the existing architecture.

---

# Theme / Topic Extraction

Before implementing a new NLP model, inspect what libraries and utilities are already available.

Prefer lightweight local approaches such as:

* keyword extraction
* frequency analysis
* category-based grouping
* TF-IDF if already available or appropriate
* existing project utilities

Do NOT introduce a large additional AI model unless there is a strong technical reason.

Do NOT use Gemini to generate the themes from the complete dataset.

The purpose is to keep Gemini responsible for **interpretation**, not expensive preprocessing.

---

# Sentiment-Aware Themes

Where possible, themes should be associated with sentiment.

For example:

```text
Camera:
Positive → 12
Negative → 27

Battery:
Positive → 38
Negative → 5

Display:
Positive → 31
Negative → 4
```

This allows Gemini to reason:

```text
Battery → customer strength
Camera → customer weakness
```

Do not invent theme counts.

If a theme cannot be confidently identified, omit it rather than fabricating information.

---

# Representative Review Selection

Representative reviews should be selected locally.

The selection should preferably consider:

* sentiment
* text quality
* diversity
* length
* duplicates

Avoid sending:

* duplicate reviews
* empty reviews
* extremely long reviews
* irrelevant reviews

Prefer a small diverse sample.

Do not expose unnecessary personally identifiable information.

For example, do not send:

```text
customer name
email
phone number
address
```

unless absolutely required.

Only send the review text and any minimal metadata needed for interpretation.

---

# Gemini Prompt Requirements

Update the Gemini insight prompt so it clearly tells Gemini:

1. Use only the supplied evidence.
2. Do not invent facts.
3. Distinguish between observed evidence and interpretation.
4. Identify positive customer aspects.
5. Identify negative customer aspects.
6. Identify recurring problems.
7. Identify improvement opportunities.
8. Provide actionable recommendations.
9. Mention evidence from representative reviews/themes when appropriate.
10. Do not claim that a theme is widespread unless the supplied data supports it.

The output should remain concise and suitable for displaying inside a dashboard.

---

# Example Desired Insight

A good output could conceptually look like:

```text
Overall Signal:
Customer sentiment is moderately positive, with positive reviews exceeding negative reviews.

What Customers Like:
- Battery life is frequently praised.
- Display quality receives positive feedback.
- Customers appreciate the product's value for money.

What Customers Dislike:
- Camera performance is a recurring concern.
- Some customers are frustrated by advertisements.
- Gaming performance is mentioned negatively in some reviews.

Recommended Actions:
1. Prioritize improvements to camera performance.
2. Reduce intrusive advertisements.
3. Maintain the current battery and display strengths.
```

This is only an example.

Gemini must generate statements based strictly on the actual supplied evidence.

---

# Existing DistilBERT Requirement

Do NOT modify the working DistilBERT sentiment implementation unnecessarily.

The current local sentiment tests have already passed:

```text
5 passed, 1 warning
```

The model is successfully performing local inference.

Keep:

```text
DistilBERT → sentiment
```

and:

```text
Gemini → interpretation / insight / recommendations
```

Do not merge these responsibilities.

---

# Existing Gemini Sentiment/Enrichment Path

There is also a separate optional Gemini sentiment/enrichment path that processes review text in batches.

It currently receives data such as:

```json
{
  "review_id": "...",
  "review_text": "..."
}
```

That path should NOT automatically be merged into the aggregate insight implementation.

Inspect the existing architecture and preserve its current purpose.

The new aggregate insight context should preferably use the already available local sentiment results instead of making another Gemini call for sentiment.

---

# API Requirements

Do not unnecessarily change the existing API structure.

The current relevant endpoints are:

```text
POST /api/datasets
POST /api/datasets/{dataset_id}/process
GET  /api/datasets/{dataset_id}/analytics
POST /api/datasets/{dataset_id}/sentiment
POST /api/datasets/{dataset_id}/insight
```

The existing `/insight` endpoint should continue to work.

If the existing service architecture can support the new context without changing the API contract, prefer that approach.

If a response schema must change, explain why before changing it.

---

# Cache Requirements

This project requires strict per-dataset cache isolation.

Different uploaded datasets must never reuse one another's sentiment or Gemini insight results.

Preserve the existing dataset-hash/cache namespace mechanism.

Do NOT:

* remove caching
* make one global insight cache
* reuse another dataset's insight
* weaken cache isolation
* delete regression tests

The existing cache regression test must remain meaningful.

---

# Streamlit Requirement

Do NOT rewire Streamlit to FastAPI.

Streamlit is currently being used as a verification/testing frontend.

The actual production frontend will be React later.

Therefore:

```text
Current:
Streamlit → local/backend functions

Future:
React → FastAPI → services
```

This task is about improving the backend Gemini insight generation and its supporting local enrichment, not redesigning the frontend.

---

# Before Coding

First inspect the existing implementation.

Look specifically at:

```text
backend/api.py
backend/services/
frontend/
tests/
```

Search for:

```text
gemini
insight
sentiment
sentiment_counts
review_text
keywords
topics
cache
dataset_hash
```

Determine:

* where analytics are generated
* where sentiment results are stored
* where review text is still available
* how the Gemini insight context is currently constructed
* how the Gemini prompt is constructed
* how cache keys are generated
* whether any existing keyword/theme utilities can be reused

---

# Clarifying Questions

Before making changes, identify any material ambiguity.

If an important architectural decision cannot be safely inferred from the existing implementation, ask me a clarifying question.

Do NOT ask unnecessary questions when the answer can be reasonably determined from the code and project requirements.

If there are no blocking questions, proceed using reasonable assumptions and clearly state those assumptions.

---

# Implementation Constraints

Make the smallest production-appropriate changes.

Do NOT:

* rewrite the project
* replace DistilBERT
* send the entire CSV to Gemini
* create another sentiment model
* make unnecessary Gemini calls
* introduce unnecessary dependencies
* expose API keys
* modify unrelated functionality
* remove existing tests
* weaken tests
* bypass cache isolation
* hardcode insights for the Redmi dataset

---

# Testing Requirements

After implementation, test at least:

### Dataset 1

The existing:

```text
redmi6(in).csv
```

with:

```text
280 reviews
```

Verify that Gemini receives useful evidence beyond sentiment counts.

### Dataset 2

A small dataset containing:

```text
positive reviews
negative reviews
neutral reviews
```

Verify that representative samples are selected correctly.

### Dataset 3

A dataset containing only:

```text
review_text
```

Verify that the insight process still works without rating.

### Dataset 4

A dataset containing:

```text
review_text
rating
category
```

Verify that additional analytics are used when available.

---

# Required Validation

Run:

```powershell
python -m pytest -q
```

and:

```powershell
python -m pytest tests/test_sentiment_service.py -q
```

Also perform an actual API test of:

```text
POST /api/datasets/{dataset_id}/insight
```

Verify that:

1. DistilBERT sentiment is still local.
2. Gemini is called only for insight generation.
3. Gemini receives aggregate sentiment information.
4. Gemini receives relevant analytics.
5. Gemini receives bounded representative review evidence.
6. Gemini receives theme/topic information when available.
7. Gemini does not receive the entire dataset.
8. Different datasets maintain separate caches.
9. The generated insight contains evidence-based positive/negative findings and recommendations.
10. Existing functionality remains intact.

---

# Final Report

After completing the work, report:

### Files changed

List every modified file and explain why it was changed.

### Data sent to Gemini

Show the final structure of the insight context, without exposing API keys or sensitive customer information.

### Sampling

Explain:

* maximum number of reviews sent
* how reviews are selected
* how duplicates/empty reviews are handled

### Theme extraction

Explain how themes/topics are generated.

### Gemini responsibility

Clearly state what Gemini does and does not do.

### Testing

Report:

```text
pytest result:
sentiment test result:
API insight test:
cache isolation test:
```

### Remaining limitations

Clearly mention anything that could not be implemented or tested.

Do not claim success if a test or API call could not actually be executed.
