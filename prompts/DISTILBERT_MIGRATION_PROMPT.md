# DistilBERT Sentiment Analysis Migration — AI Coding Agent Prompt

## Role

You are a senior Python/ML engineer working on an existing **Sentiment Analysis and Customer Review Analytics** project.

Your task is to modify the existing project so that **sentiment analysis is performed locally using a pretrained DistilBERT model instead of the Gemini API**.

Do not blindly rewrite the project.

First inspect the existing codebase, understand the current architecture and data flow, identify how Gemini is currently being used, and then make the minimum necessary changes while preserving all unrelated existing functionality.

---

# 1. IMPORTANT — DO NOT IMPLEMENT IMMEDIATELY

Before modifying any files:

1. Inspect the complete repository.
2. Understand the current frontend architecture.
3. Understand the current backend architecture.
4. Identify the current sentiment-analysis implementation.
5. Identify every location where Gemini is used.
6. Determine which Gemini features are related to sentiment analysis.
7. Determine which Gemini features are unrelated to sentiment analysis.
8. Identify the existing API endpoints.
9. Identify the existing CSV/data-processing pipeline.
10. Identify the existing data schema.
11. Identify the existing caching mechanism.
12. Identify the existing environment/configuration files.
13. Identify the existing tests.
14. Identify the existing dependency files.
15. Ask only questions that materially affect the implementation.
16. If the user does not answer, use the default assumptions defined in this document.
17. Explain the proposed changes before making major modifications.
18. Do not rewrite unrelated parts of the application.

The goal is a **controlled migration**, not a complete rewrite.

---

# 2. Primary Objective

Replace the existing Gemini-based sentiment-analysis implementation with a **local DistilBERT-based sentiment-analysis pipeline**.

## Required model

Use:

```text
distilbert-base-uncased-finetuned-sst-2-english
```

from Hugging Face Transformers.

The model must perform sentiment inference locally on the developer's machine.

The review text must NOT be sent to Gemini for sentiment classification.

The final architecture should be:

```text
Frontend
   ↓
Backend API
   ↓
Sentiment Service
   ↓
Local DistilBERT
   ↓
Sentiment + Confidence
   ↓
Backend
   ↓
Frontend Dashboard
```

---

# 3. Architecture Requirement

DistilBERT must be implemented **ONLY in the backend**.

Do NOT place:

* DistilBERT model code
* PyTorch inference code
* Hugging Face Transformers inference code
* Model-loading logic
* Model files

inside the frontend.

The frontend should only:

1. Upload data.
2. Send requests to the backend using the existing API architecture.
3. Receive sentiment results.
4. Display sentiment results and visualizations.

Do not change the frontend architecture unnecessarily.

---

# 4. Questions to Ask Before Implementation

Before modifying the project, ask the user the following important questions.

### Question 1

Should DistilBERT replace Gemini **only for sentiment analysis**, while Gemini remains available for summarization/enrichment?

### Question 2

Should the existing Gemini sentiment-analysis implementation be completely removed, or retained as optional legacy functionality?

### Question 3

What sentiment output is currently expected?

Possible options:

```text
POSITIVE / NEGATIVE
```

or

```text
POSITIVE / NEGATIVE / NEUTRAL
```

or:

```text
sentiment + confidence score
```

### Question 4

Should the existing dashboard UI remain unchanged?

### Question 5

Should existing Gemini-generated historical results remain compatible?

### Question 6

What is the expected maximum CSV size?

### Question 7

Should CPU inference be supported when CUDA is unavailable?

Do not ask unnecessary questions.

---

# 5. Default Assumptions

If the user does not answer the questions, use the following assumptions.

### Assumption 1

DistilBERT replaces Gemini **only for sentiment analysis**.

### Assumption 2

Gemini may remain available for other existing AI features such as:

* Summarization
* Keyword extraction
* Data enrichment
* Explanations
* Other explicitly defined AI functionality

### Assumption 3

The sentiment output will be:

```text
POSITIVE
NEGATIVE
```

with a confidence score.

Example:

```text
sentiment = POSITIVE
confidence = 0.9821
```

### Assumption 4

Preserve the existing dashboard UI wherever possible.

### Assumption 5

Preserve the existing data schema wherever possible.

### Assumption 6

Support both:

```text
CUDA GPU
CPU
```

### Assumption 7

Use NVIDIA GPU automatically when available.

### Assumption 8

Fall back to CPU when CUDA is unavailable or GPU inference cannot safely continue.

### Assumption 9

Do not train or fine-tune DistilBERT.

### Assumption 10

Use batch inference.

### Assumption 11

The downloaded model should be automatically cached locally by Hugging Face.

Clearly document all assumptions made.

---

# 6. Required Technology

Use:

```text
Python
PyTorch
Hugging Face Transformers
Pandas
```

Required model:

```text
distilbert-base-uncased-finetuned-sst-2-english
```

Do not replace this model with another model unless explicitly instructed.

---

# 7. Model Download and Storage

The developer does **NOT** need to manually download DistilBERT before implementation.

Use Hugging Face Transformers to download the model automatically on first execution.

Expected behavior:

```text
First run:

Application
   ↓
Check local Hugging Face cache
   ↓
Model not found
   ↓
Download from Hugging Face
   ↓
Store in local Hugging Face cache
   ↓
Load model
```

On later runs:

```text
Application
   ↓
Check local Hugging Face cache
   ↓
Model found
   ↓
Load cached model
```

Requirements:

* Do not manually require the developer to download model files.
* Do not download the model on every startup if it is already cached.
* Do not commit model files into Git.
* Do not place model files inside the frontend.
* Do not duplicate model files unnecessarily.
* Do not implement custom model downloading unless necessary.
* Use Hugging Face's standard model caching mechanism.

The only external network operation allowed specifically for DistilBERT is downloading the pretrained model if it is not already cached.

After the model is downloaded, sentiment inference must run locally.

---

# 8. Definition of Local Inference

"Local sentiment analysis" means:

```text
Review Text
    ↓
Backend
    ↓
DistilBERT running on this machine
    ↓
Sentiment Prediction
```

The review text must NOT be sent to:

* Gemini API
* OpenAI API
* External sentiment-analysis APIs
* Third-party inference APIs
* Any external service for sentiment classification

Do not use an external API as a hidden fallback for sentiment analysis.

---

# 9. Target Hardware

The primary development machine has approximately:

```text
CPU: Intel Core i5-11320H
RAM: 8 GB
GPU: NVIDIA GeForce RTX 2050
VRAM: 4 GB
OS: 64-bit Windows
```

Optimize the implementation for this hardware.

The application must not assume unlimited RAM or GPU memory.

---

# 10. GPU / CUDA Requirements

Automatically detect whether CUDA is available.

Expected behavior:

```text
CUDA available
      ↓
Use NVIDIA GPU
```

and:

```text
CUDA unavailable
      ↓
Use CPU
```

Do not hard-code:

```python
device=0
```

without checking whether CUDA is actually available.

The implementation should determine the appropriate device dynamically.

Conceptually:

```text
if CUDA available:
    device = GPU
else:
    device = CPU
```

Report the selected device through logs or application diagnostics.

Example:

```text
Device: CUDA
```

or:

```text
Device: CPU
```

---

# 11. Model Lifecycle

Load DistilBERT once and reuse it.

Do NOT:

* Load the model for every review.
* Load the model separately for every CSV row.
* Create a new pipeline for every prediction.
* Create a separate model instance for every batch.
* Reload the model unnecessarily for every API request.

Create a reusable sentiment-analysis service.

For example:

```text
backend/
└── services/
    └── sentiment_service.py
```

The exact location should follow the existing project's architecture.

---

# 12. Recommended Service Responsibilities

The sentiment service should be responsible for:

1. Loading DistilBERT.
2. Loading the tokenizer/pipeline.
3. Detecting CUDA/CPU.
4. Keeping the model loaded.
5. Receiving review text.
6. Processing reviews in batches.
7. Handling empty/invalid reviews.
8. Handling long reviews.
9. Returning sentiment and confidence.
10. Handling GPU memory problems.
11. Providing useful logging.

The service should be independent enough to be tested without the frontend.

---

# 13. Batch Inference

Do not unnecessarily process every review as an independent model call.

Prefer batch inference.

Conceptually:

```text
10,000 reviews
       ↓
Batch 1 → DistilBERT
Batch 2 → DistilBERT
Batch 3 → DistilBERT
...
       ↓
Combined Results
```

Because the target machine has only 4 GB VRAM, start with a conservative batch size.

For example:

```text
batch_size = 8
```

or:

```text
batch_size = 16
```

Make the batch size configurable.

Do not blindly increase the batch size.

Test the appropriate value on the target hardware.

---

# 14. CUDA Out-of-Memory Handling

If GPU inference causes CUDA out-of-memory:

```text
GPU inference
      ↓
CUDA OOM
      ↓
Reduce batch size
      ↓
Retry
      ↓
Still failing?
      ↓
Fall back to CPU
```

For example:

```text
batch_size = 16
       ↓
CUDA OOM
       ↓
batch_size = 8
       ↓
Retry
       ↓
Still OOM
       ↓
CPU fallback
```

Do not silently hide the original error.

Log the problem appropriately.

Do not repeatedly retry indefinitely.

---

# 15. Long Review Handling

DistilBERT has a maximum input sequence length.

Long reviews must be handled safely.

Use appropriate tokenizer truncation.

For example:

```python
truncation=True
```

Do not allow excessively long reviews to crash the application.

Document how long reviews are handled.

Do not silently discard the entire review.

If the existing project has a specific preprocessing strategy, preserve it where appropriate.

---

# 16. Empty and Invalid Reviews

Handle:

```text
NaN
None
""
whitespace-only strings
invalid data types
```

sensibly.

Do not send empty review text to DistilBERT.

A reasonable output could be:

```text
sentiment = UNKNOWN
confidence = null
```

Use the existing project's conventions if they already exist.

Do not let one invalid review crash the entire dataset-processing operation.

---

# 17. Output Schema

Preserve the existing project's data schema wherever possible.

If sentiment fields do not already exist, use something similar to:

```text
sentiment
sentiment_confidence
```

Example:

```text
sentiment = POSITIVE
sentiment_confidence = 0.9821
```

Do not unnecessarily rename existing database columns.

Do not break existing frontend charts or filters.

If a schema change is absolutely necessary, explain why before making it.

---

# 18. Gemini Separation

The most important migration rule is:

```text
Gemini → NO LONGER USED FOR SENTIMENT ANALYSIS
```

Replace:

```text
Gemini
   ↓
Sentiment Classification
```

with:

```text
Local DistilBERT
   ↓
Sentiment Classification
```

However, do NOT remove Gemini functionality unrelated to sentiment analysis.

If the existing project uses Gemini for:

* Review summarization
* Keyword generation
* Data enrichment
* Explanations
* Other AI features

preserve those features.

The goal is:

```text
Sentiment Analysis → DistilBERT
Other AI Features → Existing implementation
```

Do not migrate unrelated functionality without being asked.

---

# 19. Gemini API Key

If Gemini is no longer required anywhere in the application, clean up unused:

```text
GEMINI_API_KEY
```

configuration.

However:

**Do not remove `GEMINI_API_KEY` if another existing feature still depends on Gemini.**

Never expose API keys in source code.

Never hard-code credentials.

---

# 20. Frontend Requirements

The existing frontend/dashboard should continue working.

Do not redesign the UI unnecessarily.

Existing features such as:

* CSV upload
* Data preview
* Sentiment distribution
* Positive/negative charts
* Review tables
* Filters
* KPIs
* Export functionality

should continue working.

The user should not need to understand that the sentiment-analysis backend changed.

Optionally, if it fits naturally into the existing UI, display:

```text
Sentiment Model: DistilBERT (Local)
Device: NVIDIA GPU / CPU
```

Do not add unnecessary UI elements.

---

# 21. Existing API Requirements

Inspect the current API architecture first.

If an existing sentiment endpoint exists, prefer modifying it rather than creating an unnecessary duplicate endpoint.

For example:

```text
POST /sentiment/analyze
```

may continue to exist while its implementation changes from Gemini to DistilBERT.

Do not break existing frontend-to-backend communication unless necessary.

If an API contract must change, clearly document the change.

---

# 22. Caching

Inspect the existing caching mechanism before creating anything new.

If the application already caches sentiment results, reuse or extend it.

Do not create duplicate caching systems unnecessarily.

If caching is needed, a cache identity should consider information such as:

```text
file hash
+
model name/version
+
processing configuration
```

Do not use only the filename because two different files can have the same filename.

Do not return stale sentiment results when the model/configuration has changed.

---

# 23. Data Processing

Preserve the existing data-processing pipeline where possible.

Expected conceptual flow:

```text
CSV Upload
     ↓
Data Validation
     ↓
Data Cleaning
     ↓
Review Text Extraction
     ↓
DistilBERT Batch Inference
     ↓
Sentiment + Confidence
     ↓
Result DataFrame
     ↓
Dashboard
```

Do not duplicate the entire dataset in memory unnecessarily.

Remember that the target machine has only 8 GB RAM.

---

# 24. Large CSV Handling

The system should be tested with:

```text
100 reviews
500 reviews
1,000 reviews
5,000 reviews
10,000 reviews
```

Do not assume that processing 10,000 reviews means loading unnecessary copies of the dataset.

Use efficient Pandas operations.

If the existing application already has chunking or streaming, preserve it.

Do not implement premature optimization if the existing project does not need it.

---

# 25. Logging

Add useful logs such as:

```text
Loading DistilBERT...
Model: distilbert-base-uncased-finetuned-sst-2-english
Checking CUDA...
Using device: CUDA
Loading cached model...
Model loaded successfully
Processing 1,000 reviews
Batch size: 8
Sentiment analysis completed
```

Do NOT log:

* API keys
* passwords
* unnecessary private information
* entire customer reviews unnecessarily

Logs should help diagnose model-loading and performance issues.

---

# 26. Error Handling

Handle at least:

* Model download failure
* Hugging Face loading failure
* Missing Transformers package
* Missing PyTorch
* CUDA unavailable
* CUDA out-of-memory
* Empty reviews
* Null values
* Invalid input types
* Very long reviews
* Invalid CSV files
* Large datasets
* Backend API errors

Do not crash the entire dashboard because of one malformed review.

Errors should be meaningful and actionable.

---

# 27. CPU Fallback

The project must work even without an NVIDIA GPU.

Expected behavior:

```text
GPU available
     ↓
Use CUDA
```

or:

```text
GPU unavailable
     ↓
Use CPU
```

The application should not fail simply because CUDA is unavailable.

The user should not need to modify application code manually to switch between CPU and GPU.

---

# 28. Dependencies

Inspect the existing dependency file first.

Likely required packages include:

```text
torch
transformers
```

Add only the dependencies actually required.

Do not blindly add random versions.

Avoid dependency duplication.

Check compatibility with the existing Python environment.

Do not replace the entire dependency file unnecessarily.

---

# 29. Python Environment

Do not create a second virtual environment if the project already has a working environment unless there is a clear reason.

Inspect:

```text
Python version
Installed packages
Existing virtual environment
Existing requirements
```

before making changes.

Prefer compatibility with the existing project.

---

# 30. Testing Requirements

Create or update tests.

At minimum, test the following.

## Test 1 — Positive review

Input:

```text
"This product is excellent and I really love it."
```

Expected sentiment:

```text
POSITIVE
```

## Test 2 — Negative review

Input:

```text
"This product is terrible and completely useless."
```

Expected sentiment:

```text
NEGATIVE
```

## Test 3 — Empty review

Verify that it does not crash.

## Test 4 — Multiple reviews

Verify batch inference.

## Test 5 — CPU

Verify the application works without CUDA.

## Test 6 — GPU

If CUDA is available, verify GPU inference.

## Test 7 — Long review

Verify that long text does not crash the application.

## Test 8 — CSV

Run sentiment analysis against a realistic CSV.

## Test 9 — Existing dashboard

Verify that the frontend receives and displays the sentiment results correctly.

## Test 10 — Gemini isolation

Verify that sentiment analysis does not make Gemini API calls.

---

# 31. Performance Testing

Test with representative datasets:

```text
100 reviews
500 reviews
1,000 reviews
5,000 reviews
10,000 reviews
```

Record approximately:

```text
Dataset size
Processing time
Device used
Batch size
Memory behavior
VRAM behavior
```

Do not claim that the model is "fast" without testing it.

Do not claim GPU acceleration without checking that CUDA is actually being used.

---

# 32. Model Information

The final implementation should clearly identify:

```text
Model:
distilbert-base-uncased-finetuned-sst-2-english

Inference:
Local

Task:
Sentiment Classification

Sentiment classes:
POSITIVE / NEGATIVE

Device:
CUDA / CPU

Batch size:
Configurable
```

---

# 33. Code Quality

Follow the existing project's coding conventions.

Use:

* Clear function names
* Type hints where appropriate
* Small reusable functions
* Proper exception handling
* Meaningful comments
* Configuration instead of hard-coded values
* Reusable model/service instances

Avoid:

* Huge functions
* Duplicate code
* Global state that makes testing difficult
* Hard-coded GPU assumptions
* Hard-coded paths
* Repeated model initialization

---

# 34. What NOT To Do

Do NOT:

1. Use Gemini for sentiment analysis.
2. Send review text to Gemini for sentiment classification.
3. Use OpenAI or another external API for sentiment classification.
4. Put DistilBERT in the frontend.
5. Put PyTorch inference code in the frontend.
6. Require manual model downloading.
7. Download the model on every application startup.
8. Commit downloaded model files to Git.
9. Train DistilBERT from scratch.
10. Fine-tune DistilBERT automatically.
11. Replace DistilBERT with BERT-large.
12. Replace it with a 7B+ LLM.
13. Load the model for every review.
14. Create a model instance for every batch.
15. Assume CUDA is always available.
16. Assume 4 GB VRAM is unlimited.
17. Assume 8 GB RAM is unlimited.
18. Process unnecessarily huge batches.
19. Rewrite the entire application.
20. Redesign unrelated UI.
21. Remove unrelated Gemini features.
22. Remove `GEMINI_API_KEY` if other Gemini features still need it.
23. Break the existing CSV/data schema unnecessarily.
24. Add unnecessary dependencies.
25. Hard-code API keys.
26. Hide errors silently.
27. Retry CUDA failures indefinitely.
28. Create duplicate caching mechanisms without checking the existing one.
29. Make unsupported performance claims.
30. Make architectural changes unrelated to this migration.

---

# 35. Decision-Making Rule

When encountering ambiguity:

### Priority 1

Follow the existing project requirements.

### Priority 2

Preserve backward compatibility.

### Priority 3

Keep DistilBERT local and backend-only.

### Priority 4

Choose the simplest reliable solution for:

```text
Intel i5-11320H
8 GB RAM
RTX 2050 4 GB VRAM
```

### Priority 5

Ask the user if the decision materially changes the architecture or expected behavior.

### Otherwise

Make a reasonable assumption and continue.

Do not repeatedly ask for confirmation for minor implementation decisions.

Document important assumptions.

---

# 36. Target Architecture

The target architecture should conceptually look like:

```text
                         CSV Upload
                              │
                              ↓
                       Data Validation
                              │
                              ↓
                         Preprocessing
                              │
                              ↓
                       Review Text
                              │
                              ↓
                ┌──────────────────────────┐
                │   Sentiment Service      │
                │                          │
                │  Hugging Face            │
                │  DistilBERT              │
                │                          │
                │  Local Inference         │
                └─────────────┬────────────┘
                              │
                              ↓
                  Sentiment + Confidence
                              │
                              ↓
                       Result DataFrame
                              │
                              ↓
                          Dashboard
```

If other Gemini-powered features exist:

```text
                         Review Data
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ↓                         ↓
        Local DistilBERT               Gemini API
                 │                         │
                 ↓                         ↓
        Sentiment Analysis          Other AI Features
                 │                  (Summary/Enrichment)
                 │                         │
                 └────────────┬────────────┘
                              ↓
                         Final Results
                              ↓
                           Dashboard
```

---

# 37. Expected File Organization

Adapt this to the existing architecture rather than blindly creating these files.

A reasonable structure is:

```text
project/
│
├── frontend/
│   └── ...
│
├── backend/
│   ├── main.py
│   │
│   ├── routes/
│   │   └── sentiment.py
│   │
│   ├── services/
│   │   ├── sentiment_service.py
│   │   ├── summarization_service.py
│   │   └── ...
│   │
│   └── ...
│
├── tests/
│   └── test_sentiment.py
│
├── requirements.txt
├── .env
└── README.md
```

The most important principle is:

```text
DistilBERT implementation → backend/services
```

not frontend.

Do not create unnecessary files if the existing architecture already has appropriate locations.

---

# 38. Documentation

Update project documentation where appropriate.

Document:

* Model name
* Local inference
* GPU/CPU support
* Automatic Hugging Face model download
* Model caching
* Sentiment classes
* Batch processing
* Hardware considerations
* Installation requirements
* How to run the application
* How to verify CUDA
* How Gemini is separated from sentiment analysis

Do not document untested behavior as guaranteed.

---

# 39. Final Deliverables

After implementation, provide the following.

## 39.1 Summary

Explain:

* What was changed.
* Why it was changed.
* Where DistilBERT is implemented.
* How sentiment analysis now works.
* What happened to Gemini.
* Whether frontend functionality was preserved.

## 39.2 Modified Files

List every modified or created file.

Example:

```text
backend/services/sentiment_service.py
backend/routes/sentiment.py
requirements.txt
tests/test_sentiment.py
README.md
```

Explain the purpose of each file.

## 39.3 Model Information

Report:

```text
Model:
distilbert-base-uncased-finetuned-sst-2-english

Inference:
Local

Device:
CUDA / CPU

Batch size:
...

Sentiment classes:
POSITIVE / NEGATIVE
```

## 39.4 Assumptions

Clearly list assumptions made because the user did not answer questions.

## 39.5 Testing

Report:

* Tests performed
* Dataset sizes tested
* CPU/GPU results
* Batch size
* Errors encountered
* Fixes applied

## 39.6 Remaining Issues

Clearly mention anything that could not be tested or completed.

Do not claim success for anything that was not actually verified.

---

# 40. Definition of Done

The migration is complete only when:

* [ ] Existing repository has been inspected.
* [ ] Existing architecture has been understood.
* [ ] Existing sentiment-analysis flow has been identified.
* [ ] All Gemini usage has been identified.
* [ ] Gemini sentiment functionality has been identified.
* [ ] User questions have been asked.
* [ ] Reasonable assumptions have been made where necessary.
* [ ] DistilBERT is used for sentiment analysis.
* [ ] Required model is `distilbert-base-uncased-finetuned-sst-2-english`.
* [ ] DistilBERT runs locally.
* [ ] Review text is not sent to Gemini for sentiment analysis.
* [ ] DistilBERT exists only in the backend.
* [ ] Frontend remains responsible for presentation.
* [ ] Automatic Hugging Face model download works.
* [ ] Hugging Face caching is used.
* [ ] Model files are not committed to Git.
* [ ] CUDA is detected automatically.
* [ ] RTX 2050 is used when available.
* [ ] CPU fallback works.
* [ ] Batch inference is implemented.
* [ ] Batch size is configurable.
* [ ] Long reviews are handled safely.
* [ ] Empty reviews are handled.
* [ ] CUDA out-of-memory handling exists.
* [ ] Existing dashboard functionality works.
* [ ] Existing data schema is preserved where possible.
* [ ] Existing Gemini features unrelated to sentiment are preserved.
* [ ] Dependencies are updated appropriately.
* [ ] API keys are not hard-coded.
* [ ] Tests are added/updated.
* [ ] GPU/CPU testing is performed where possible.
* [ ] Representative CSV testing is performed.
* [ ] Documentation is updated.
* [ ] Assumptions are documented.
* [ ] Remaining limitations are documented.

---

# FINAL INSTRUCTION

The core requirement is:

> **Replace Gemini-based sentiment analysis with local inference using `distilbert-base-uncased-finetuned-sst-2-english`.**

The intended architecture is:

```text
Frontend
    ↓
Backend
    ↓
Local DistilBERT
    ↓
Sentiment + Confidence
    ↓
Dashboard
```

Gemini may continue to be used for unrelated AI-enrichment functionality if it already exists.

Do not rewrite unrelated functionality.

Do not manually require the developer to download the model.

Do not send review text to an external API for sentiment analysis.

Do not assume CUDA is available.

Do not assume unlimited RAM or VRAM.

Before implementation:

```text
1. Inspect
2. Understand
3. Identify Gemini usage
4. Ask important questions
5. Make assumptions if necessary
6. Explain proposed changes
7. Implement
8. Test
9. Fix issues
10. Document
11. Summarize final implementation
```

**Prioritize correctness, stability, maintainability, and compatibility with the existing project over unnecessary architectural changes.**
