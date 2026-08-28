# API Specification
## AI-Powered Customer Feedback Analytics Platform

**Version:** 1.0

---

# Purpose

This document defines the interfaces between the different modules of the application.

Although the current implementation is a Streamlit application, the architecture is designed so that every module behaves like an independent service.

Future versions can expose these services as REST APIs without changing the business logic.

---

# API Architecture

```
                 Dashboard
                     │
                     ▼
             Service Layer APIs
                     │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
 CSV Service    Gemini Service   Analytics Service
      │              │              │
      └──────────────┼──────────────┘
                     ▼
                Processed Dataset
```

---

# Service Overview

| Service | Responsibility |
|----------|----------------|
| CSV Service | Upload and validate CSV |
| Preprocessing Service | Clean and prepare data |
| Gemini Service | AI enrichment |
| Analytics Service | Generate KPIs |
| Dashboard Service | Visualization |
| Export Service | Download processed data |

---

# CSV Service

## Purpose

Receives and validates uploaded datasets.

---

### Function

```python
load_csv(file_path: str) -> pd.DataFrame
```

---

### Input

| Parameter | Type | Description |
|-----------|------|-------------|
| file_path | String | CSV file location |

---

### Output

```
Pandas DataFrame
```

---

### Validation

- CSV exists
- UTF-8 encoding
- Required columns
- File not empty

---

### Errors

| Error | Description |
|--------|-------------|
| FileNotFoundError | File missing |
| EmptyDataError | Empty CSV |
| InvalidSchema | Missing columns |

---

# Preprocessing Service

## Purpose

Clean customer reviews before AI processing.

---

### Function

```python
clean_dataset(df: pd.DataFrame) -> pd.DataFrame
```

---

### Operations

- Remove duplicates
- Handle missing values
- Normalize ratings
- Standardize dates
- Clean review text

---

### Output

Clean DataFrame

---

# Feature Generation Service

## Function

```python
generate_features(df)
```

---

### Generated Columns

- review_length
- month
- year
- cleaned_review

---

# Gemini Service

## Purpose

Generate AI insights.

---

### Function

```python
analyze_reviews(batch)
```

---

### Input

```json
[
  {
    "review_id":1001,
    "review":"Battery backup is excellent."
  }
]
```

---

### Output

```json
[
  {
    "review_id":1001,
    "sentiment":"Positive",
    "complaint_category":"Battery",
    "summary":"Customer likes battery.",
    "keywords":["battery"],
    "priority":"Low"
  }
]
```

---

### Retry Rules

- Invalid JSON
- Timeout
- Network failure

Maximum retries

```
3
```

---

# Analytics Service

## Purpose

Generate business metrics.

---

### Function

```python
generate_dashboard_metrics(df)
```

---

### Returns

```python
{
 "total_reviews":1000,
 "positive_reviews":650,
 "negative_reviews":210,
 "average_rating":4.2
}
```

---

### KPIs

- Total Reviews
- Average Rating
- Sentiment Distribution
- Complaint Categories
- Product Ranking
- Brand Ranking

---

# Dashboard Service

## Purpose

Render interactive visualizations.

---

### Function

```python
render_dashboard(df)
```

---

### Dashboard Components

- KPI Cards
- Pie Chart
- Line Chart
- Bar Chart
- Word Cloud
- Filters
- Review Explorer

---

# Export Service

## Function

```python
export_csv(df)
```

---

### Output

```
processed_reviews.csv
```

---

# Internal Service Flow

```mermaid
flowchart LR

Upload

-->

CSV Service

-->

Preprocessing

-->

Feature Generator

-->

Gemini Service

-->

Analytics Service

-->

Dashboard

-->

Export
```

---

# Request Lifecycle

```
Upload CSV

↓

Validate

↓

Clean

↓

Generate Features

↓

Gemini

↓

Validate JSON

↓

Append Columns

↓

Analytics

↓

Dashboard

↓

Export
```

---

# Error Response Format

All services should return structured errors.

Example

```json
{
  "status":"error",
  "message":"Missing required column: review_text",
  "code":"INVALID_SCHEMA"
}
```

---

# Success Response Format

```json
{
  "status":"success",
  "message":"Dataset processed successfully."
}
```

---

# Logging Requirements

Every service should log:

- Request Started
- Request Completed
- Processing Time
- Errors
- Retry Attempts

Never log:

- API keys
- Secrets
- User credentials

---

# Future REST API Design

If a backend is added, the following endpoints are recommended.

---

## Upload Dataset

### Endpoint

```
POST /api/upload
```

### Request

```
multipart/form-data
```

### Response

```json
{
 "status":"success",
 "dataset_id":"abc123"
}
```

---

## Process Dataset

### Endpoint

```
POST /api/process
```

### Request

```json
{
 "dataset_id":"abc123"
}
```

### Response

```json
{
 "status":"processing"
}
```

---

## Get Analytics

### Endpoint

```
GET /api/analytics
```

---

### Response

```json
{
 "total_reviews":1000,
 "positive":650,
 "neutral":140,
 "negative":210
}
```

---

## Download Processed CSV

### Endpoint

```
GET /api/download
```

### Response

```
processed_reviews.csv
```

---

# HTTP Status Codes (Future)

| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Invalid Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

# API Security

Future REST APIs should implement:

- HTTPS
- API authentication
- Rate limiting
- Input validation
- File size limits
- CORS configuration

---

# Performance Guidelines

- Batch Gemini requests
- Cache repeated reviews
- Reuse API client
- Minimize memory usage
- Avoid duplicate processing

---

# Versioning

Current Version

```
v1.0
```

Future versions should follow:

```
/api/v1/
/api/v2/
```

---

# Acceptance Criteria

The API layer is complete when:

- Services are modular.
- Inputs are validated.
- Errors are standardized.
- Responses are consistent.
- Logging is implemented.
- Future REST migration is possible.

---

# Definition of Done

The API specification is complete when:

- Every service has a defined interface.
- Input and output formats are documented.
- Error handling is specified.
- Future REST endpoints are defined.
- Security and performance considerations are included.

---

# End of Document