# Prompt: Fix Dataset Mapping Workflow After DistilBERT Sentiment Migration

## Project Context

I am developing a **Feedback Management / Sentiment Analysis Dashboard**.

The application allows users to upload CSV files containing customer reviews/feedback. The backend processes the uploaded dataset, performs sentiment analysis, generates analytics, and uses Gemini for higher-level AI insights and recommendations.

The project currently has this general architecture:

```text
CSV Upload
    ↓
Streamlit Frontend
    ↓
FastAPI Backend
    ↓
Dataset Processing
    ↓
DistilBERT → Sentiment Analysis
    ↓
Analytics
    ↓
Gemini API → AI Insights / Recommendations
    ↓
Streamlit Dashboard
```

### Technology decisions

* Frontend: Streamlit
* Backend: FastAPI
* Dataset processing: Python / Pandas
* Local sentiment model: `distilbert-base-uncased-finetuned-sst-2-english`
* AI insights/recommendations: Google Gemini API
* Python environment: Python 3.12
* Operating system: Windows
* Local machine has NVIDIA RTX 2050 4 GB GPU and 8 GB RAM

The important architectural decision is:

```text
DistilBERT
    ↓
Sentiment Analysis

Gemini API
    ↓
AI Insights
Recommendations
Other higher-level enrichment
```

Do NOT move sentiment analysis back to Gemini.

---

# Current Backend API

The FastAPI application is located at:

```text
backend/api.py
```

and contains:

```python
app = FastAPI(
    title="Feedback Management API",
    version="1.0.0"
)
```

The currently exposed API endpoints are:

```text
GET  /api/health

POST /api/datasets

POST /api/datasets/{dataset_id}/process

GET  /api/datasets/{dataset_id}/analytics

POST /api/datasets/{dataset_id}/sentiment

POST /api/datasets/{dataset_id}/insight

GET  /api/datasets/{dataset_id}/download
```

The FastAPI Swagger documentation is available at:

```text
http://127.0.0.1:8000/docs
```

The backend is running successfully.

Visiting `/` returns:

```json
{
  "detail": "Not Found"
}
```

This is acceptable because there is no root route. The API itself is working.

---

# DistilBERT Status

The local DistilBERT sentiment implementation has already been added.

The test:

```text
tests/test_sentiment_service.py
```

was executed and produced:

```text
5 passed, 1 warning in 256.12s
```

The warning was from Hugging Face about Windows symlink support:

```text
huggingface_hub cache-system uses symlinks by default...
```

This is only a caching warning and is NOT currently considered an error.

The important result is:

```text
5 passed
```

Therefore:

* DistilBERT loads successfully.
* The model can perform local inference.
* Known positive and negative reviews are classified successfully.
* The local sentiment service is functioning.

Do NOT replace or rewrite the working DistilBERT implementation unless investigation proves it is necessary.

---

# Existing Test Status

The complete test suite currently gives:

```text
1 failed, 27 passed, 1 skipped
```

The failed test is:

```text
tests/test_regressions.py::test_dataset_hash_creates_a_separate_cache_namespace
```

The error references:

```text
data/cache/hash-a/gemini_cache.json
```

This appears related to the previous Gemini-based sentiment/cache architecture.

I have intentionally NOT fixed this regression yet.

Do NOT remove or weaken this test simply to make the test suite pass.

The original requirement must be preserved:

> Every uploaded dataset must have its own separate cache namespace.

The new architecture should still maintain dataset-isolated caching for both local sentiment results and Gemini-generated results where applicable.

A possible architecture is:

```text
data/cache/
├── dataset_hash_a/
│   ├── sentiment_cache.json
│   └── gemini_insights.json
│
└── dataset_hash_b/
    ├── sentiment_cache.json
    └── gemini_insights.json
```

This is only an example. Inspect the existing implementation before deciding the final structure.

---

# Current Dataset Upload Test

I tested:

```text
POST /api/datasets
```

using this CSV:

```text
redmi6(in).csv
```

The CSV contains 280 records and these columns:

```text
Review Title
Customer name
Rating
Date
Category
Comments
Useful
```

The upload endpoint successfully returned:

```json
{
  "dataset_id": "046966c3-afab-44d6-8aa3-18cc1bb0c7b0",
  "filename": "redmi6(in).csv",
  "file_size": 67608,
  "columns": [
    "Review Title",
    "Customer name",
    "Rating",
    "Date",
    "Category",
    "Comments",
    "Useful"
  ],
  "record_count": 280,
  "suggested_mapping": {
    "review_id": null,
    "review_text": null,
    "rating": "Rating",
    "review_date": "Date",
    "product_name": null,
    "brand": null,
    "category": "Category",
    "sentiment": null
  },
  "required_field": "review_text"
}
```

The important problem is:

```text
review_text → null
```

even though the dataset clearly contains a review/feedback column:

```text
Comments
```

The actual review content is stored in `Comments`.

For example:

```text
Comments:
"Another Midrange killer Smartphone by Xiaomi

Major Highlights:
...
Final Verdict:
..."
```

Therefore, the system should reasonably be able to identify:

```text
Comments
    ↓
review_text
```

or allow the user to explicitly map:

```text
Comments → Feedback / review text
```

---

# Current Error

After uploading the dataset, I attempted:

```text
POST /api/datasets/{dataset_id}/process
```

using the returned dataset ID:

```text
046966c3-afab-44d6-8aa3-18cc1bb0c7b0
```

The API returned HTTP 400:

```json
{
  "detail": "Process and confirm the dataset mapping before using this endpoint."
}
```

This means the backend correctly prevents processing until the required dataset mapping has been confirmed.

However, the current Swagger API list does not contain an obvious separate mapping-confirmation endpoint.

The available endpoints are only:

```text
GET  /api/health
POST /api/datasets
POST /api/datasets/{dataset_id}/process
GET  /api/datasets/{dataset_id}/analytics
POST /api/datasets/{dataset_id}/sentiment
POST /api/datasets/{dataset_id}/insight
GET  /api/datasets/{dataset_id}/download
```

There is no obvious:

```text
POST /api/datasets/{dataset_id}/mapping
POST /api/datasets/{dataset_id}/confirm-mapping
```

endpoint.

Therefore, I need you to investigate how the current mapping workflow was intended to work.

---

# Main Task

Inspect the existing project implementation and determine:

1. Where dataset mapping is created.
2. Where the suggested mapping is generated.
3. Where mapping confirmation is stored.
4. Why `Comments` is not currently detected as `review_text`.
5. How the backend expects mapping confirmation to happen.
6. Whether the Streamlit frontend already contains a mapping/confirmation UI.
7. Whether mapping confirmation is supposed to happen through an existing request body rather than a separate endpoint.
8. Whether an API endpoint is missing.
9. Whether the current `/process` endpoint is correctly enforcing mapping confirmation.

Do NOT assume the solution before inspecting the code.

---

# Required Mapping Behavior

The system should support flexible real-world CSV files.

The only mandatory logical field should be:

```text
review_text
```

Other fields should be optional:

```text
review_id
rating
review_date
product_name
brand
category
sentiment
```

The application should recognize common review-text column names where possible.

Examples:

```text
review_text
Review Text
Review
Reviews
Comment
Comments
Feedback
Description
Customer Feedback
Customer Review
```

For this particular CSV:

```text
Comments
```

should preferably be suggested as:

```text
review_text → Comments
```

However, do not blindly map unrelated columns.

If automatic mapping is uncertain, the frontend should allow the user to manually select the appropriate source column.

---

# Required User Workflow

The intended workflow should be clear and usable:

```text
1. User uploads CSV
          ↓
2. Backend inspects columns
          ↓
3. Backend generates suggested mapping
          ↓
4. Frontend displays mapping
          ↓
5. User confirms/edits mapping
          ↓
6. Mapping is stored for this dataset
          ↓
7. Dataset processing is allowed
          ↓
8. DistilBERT performs sentiment analysis
          ↓
9. Analytics are generated
          ↓
10. Gemini generates higher-level insights/recommendations
```

The user should NOT be forced to manually modify their original CSV simply because the column is called `Comments`.

---

# Important Compatibility Requirement

The system must continue to support CSV files where:

### Case 1 — Standard review column

```csv
review_text
I love this product
This product is terrible
```

This should work.

### Case 2 — Comments column

```csv
Comments
I love this product
This product is terrible
```

This should work.

### Case 3 — Review text + rating

```csv
review_text,rating
I love this product,5
This product is terrible,1
```

This should work.

### Case 4 — Review text only

```csv
review_text
Excellent product
Bad product
```

Sentiment analysis MUST work without a rating column.

Rating-based analytics should simply be unavailable or omitted when there is no rating.

Do NOT make `rating` a mandatory field.

---

# DistilBERT Requirements

Do NOT change the architectural decision:

```text
DistilBERT → Sentiment Analysis
Gemini → AI Insights / Recommendations
```

DistilBERT should:

* run locally
* work without a Gemini API call
* support CPU fallback when CUDA is unavailable
* preferably support batch inference
* load the model once rather than loading it for every review
* return sentiment results and confidence where supported
* work for text-only datasets

Do not introduce Gemini API calls into the sentiment service.

---

# Gemini Requirements

Gemini should remain responsible for higher-level AI functionality such as:

```text
AI-generated insights
Recommendations
Potential trends
Business-level interpretation
```

Do not use Gemini as a replacement for the local DistilBERT sentiment model.

The existing Gemini cache behavior should remain isolated per dataset.

---

# Cache Requirements

This is extremely important.

Different uploaded files must NEVER accidentally reuse each other's results.

For example:

```text
Dataset A
    ↓
Cache A

Dataset B
    ↓
Cache B
```

Dataset A's sentiment or Gemini results must not appear for Dataset B.

Use the existing dataset hash/namespace mechanism if it is already implemented correctly.

Do not remove cache isolation just to fix tests.

The existing failing regression test:

```text
test_dataset_hash_creates_a_separate_cache_namespace
```

must eventually be updated or fixed appropriately to reflect the new architecture.

---

# Frontend/API Requirement

The Streamlit frontend must be able to complete the mapping workflow.

The final API should provide a clear way for the frontend to:

```text
Upload dataset
      ↓
Receive dataset_id + suggested mapping
      ↓
Display/edit mapping
      ↓
Confirm mapping
      ↓
Process dataset
      ↓
Run sentiment
      ↓
Generate analytics
      ↓
Generate Gemini insights
```

If the existing API design already supports this, reuse it.

If an endpoint is genuinely missing, add the smallest appropriate endpoint.

Do not create unnecessary duplicate endpoints.

---

# What NOT To Do

Do NOT:

* move sentiment analysis back to Gemini
* remove DistilBERT
* remove mapping validation
* bypass the mapping confirmation requirement
* hardcode `Comments` specifically for this one dataset
* require users to rename their CSV columns manually
* make `rating` mandatory
* make category mandatory
* remove cache isolation
* delete regression tests just because they fail
* weaken tests to make CI pass
* rewrite unrelated parts of the application
* introduce unnecessary new dependencies
* create duplicate sentiment endpoints
* expose API keys in frontend code
* put Gemini API keys in `app.py`
* make the frontend directly load or execute DistilBERT if the backend is responsible for inference

---

# Implementation Strategy

Before modifying anything:

## Phase 1 — Inspect

Inspect:

```text
backend/api.py
backend/
frontend/
tests/
```

Search for:

```text
suggested_mapping
review_text
mapping
mapping_confirmed
confirm
Process and confirm the dataset mapping
dataset_hash
gemini_cache
sentiment_cache
DistilBERT
```

Determine the existing intended workflow.

## Phase 2 — Explain

Before making changes, provide a concise explanation of:

* current mapping flow
* reason for the 400 response
* reason `Comments` was not detected
* where mapping confirmation currently occurs
* whether the frontend already supports it
* what needs to change

## Phase 3 — Implement

Implement only the necessary changes.

Prioritize:

1. Correct mapping detection.
2. Clear mapping confirmation workflow.
3. Frontend compatibility.
4. DistilBERT sentiment compatibility.
5. Dataset-specific caching.
6. Tests.

## Phase 4 — Test

Run:

```powershell
python -m pytest -q
```

Then specifically run:

```powershell
python -m pytest tests/test_sentiment_service.py -q
```

Also test the actual API workflow using Swagger.

Test at least:

```text
Comments → review_text
review_text → review_text
review_text only
review_text + rating
```

---

# Expected Final Result

I should be able to perform this workflow:

```text
Upload redmi6(in).csv
        ↓
System detects:
Comments → review_text
Rating → rating
Date → review_date
Category → category
        ↓
Confirm mapping
        ↓
Process dataset
        ↓
DistilBERT sentiment analysis
        ↓
Analytics
        ↓
Gemini insights
        ↓
Dashboard
```

The user should not receive:

```json
{
  "detail": "Process and confirm the dataset mapping before using this endpoint."
}
```

after a valid mapping has been confirmed.

The system should instead proceed to processing.

---

# Final Validation Criteria

Consider the task complete only when:

* [ ] Dataset upload works.
* [ ] `dataset_id` is generated.
* [ ] `Comments` can be mapped to `review_text`.
* [ ] Mapping can be confirmed.
* [ ] `/process` accepts a confirmed mapping.
* [ ] Text-only CSVs work.
* [ ] Rating remains optional.
* [ ] DistilBERT sentiment works locally.
* [ ] Gemini remains responsible for insights/recommendations.
* [ ] Different datasets have isolated caches.
* [ ] Existing working tests remain passing.
* [ ] Relevant regression tests are corrected rather than deleted.
* [ ] Streamlit can communicate with the FastAPI workflow.
* [ ] No API keys are exposed.
* [ ] No unnecessary architectural changes are introduced.

Do not assume the implementation details. Inspect the existing code first, identify the root cause, then make the smallest production-appropriate change.
