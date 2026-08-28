# Project Rules
## AI-Powered Customer Feedback Analytics Platform

**Version:** 1.0

---

# Purpose

This document defines the coding standards, architecture guidelines, security policies, and development rules that must be followed throughout the project.

All developers and AI coding assistants must follow these rules.

If any implementation conflicts with these rules, this document takes precedence.

---

# General Principles

The project must follow:

- Clean Architecture
- Modular Design
- Reusable Components
- Separation of Concerns
- DRY (Don't Repeat Yourself)
- SOLID Principles
- Python Best Practices
- PEP 8 Coding Style

---

# Repository Structure

The repository structure must never be changed without updating the documentation.

```
customer-feedback-dashboard/

│
├── docs/
├── src/
├── tests/
├── assets/
├── data/
├── logs/
│
├── requirements.txt
├── README.md
├── .env.example
└── .gitignore
```

---

# Folder Responsibilities

## docs/

Contains all project documentation.

No application code.

---

## src/

Contains all source code.

---

## tests/

Contains unit tests and integration tests.

---

## assets/

Contains images, icons, and static files.

---

## data/

Contains datasets.

```
data/

raw/

processed/

cache/
```

---

## logs/

Contains log files.

---

# Python Version

Python 3.11+

---

# Naming Conventions

## Files

Use snake_case.

Examples

```
csv_processor.py

gemini_service.py

analytics_engine.py
```

---

## Classes

Use PascalCase.

```
GeminiService

CSVProcessor

DashboardManager
```

---

## Functions

Use snake_case.

```
load_csv()

clean_reviews()

generate_summary()
```

---

## Variables

Use meaningful names.

Good

```
average_rating

review_length

sentiment_score
```

Bad

```
a

temp

x
```

---

# Code Style

Follow PEP8.

Maximum line length

```
88 characters
```

Indentation

```
4 spaces
```

Never use tabs.

---

# Type Hints

Every public function must include type hints.

Example

```python
def clean_reviews(df: pd.DataFrame) -> pd.DataFrame:
    ...
```

---

# Docstrings

Every public function must contain a docstring.

Example

```python
def load_csv(file_path: str) -> pd.DataFrame:
    """
    Load and validate a CSV dataset.

    Parameters
    ----------
    file_path : str
        Path to the CSV file.

    Returns
    -------
    pd.DataFrame
    """
```

---

# Comments

Write comments only when necessary.

Prefer readable code over excessive comments.

---

# Logging

Never use

```python
print()
```

Use

```python
logging
```

Example

```python
logger.info()

logger.warning()

logger.error()
```

---

# Exception Handling

Never suppress exceptions.

Bad

```python
except:
    pass
```

Good

```python
except Exception as e:
    logger.exception(e)
    raise
```

---

# Environment Variables

Never hardcode:

- API Keys
- Secrets
- Tokens
- Passwords

Always use

```
.env
```

Example

```
GEMINI_API_KEY=
```

Load using

```
python-dotenv
```

---

# Security Rules

Never commit

```
.env
```

Always commit

```
.env.example
```

Never expose API keys in:

- source code
- logs
- screenshots
- documentation

---

# Gemini API Rules

Only use

```
Google Gemini API
```

Do not use:

- OpenAI
- Anthropic
- Groq
- DeepSeek

unless explicitly approved.

---

# Rate Limiting

Maximum

```
10 reviews
```

per API request.

Wait

```
3 seconds
```

between requests.

Retry

```
3
```

times.

Use exponential backoff.

---

# Prompt Engineering

Prompt must request

- Sentiment
- Complaint Category
- Summary
- Keywords
- Priority

Response format

```
JSON ONLY
```

---

# JSON Validation

Always validate responses.

If invalid

Retry request.

Never assume AI output is valid.

---

# CSV Validation

Required columns must exist.

Missing columns should stop processing with a descriptive error.

---

# Data Cleaning

Always

- remove duplicates
- trim whitespace
- handle missing values
- standardize dates
- normalize ratings

---

# Analytics Rules

Calculate

- Total Reviews
- Positive
- Neutral
- Negative
- Average Rating
- Product Analysis
- Brand Analysis
- Category Analysis
- Complaint Analysis

---

# Dashboard Rules

Dashboard must include

- KPI Cards
- Charts
- Filters
- Search
- Review Explorer
- Download Button

---

# Performance Rules

Batch process reviews.

Cache processed reviews.

Avoid duplicate API requests.

Never process the same review twice.

---

# File Size Rules

No file should exceed

```
500 lines
```

Split large modules.

---

# Import Rules

Group imports.

Example

```python
# Standard Library

# Third Party

# Local Imports
```

---

# Dependencies

Only use packages listed in

```
requirements.txt
```

Do not install unnecessary libraries.

---

# Git Rules

Commit messages

Examples

```
feat: add csv validation

fix: handle api timeout

docs: update dashboard design

refactor: improve preprocessing
```

---

# Testing Rules

Every module should have corresponding tests.

Test

- happy path
- invalid input
- edge cases
- API failures

---

# Documentation Rules

Whenever a feature changes

Update

- PROJECT_SPECIFICATION.md
- IMPLEMENTATION_PLAN.md
- CHANGELOG.md

---

# AI Coding Assistant Rules

Before generating code

Always read

1. PROJECT_SPECIFICATION.md

2. PROJECT_RULES.md

3. IMPLEMENTATION_PLAN.md

Do not generate the complete project.

Complete one task only.

Explain

- what was implemented

- modified files

- assumptions

Wait for confirmation.

---

# Prohibited Practices

Never

- hardcode API keys
- use print() for debugging
- duplicate code
- ignore exceptions
- commit .env
- bypass validation
- skip logging
- skip type hints
- skip docstrings

---

# Code Review Checklist

Before considering a task complete:

- Code follows PEP8
- Type hints added
- Docstrings added
- Logging implemented
- Exceptions handled
- No hardcoded secrets
- Modular design maintained
- Documentation updated
- Tests pass

---

# Definition of Done

A task is complete only if:

- Requirements are implemented.
- Code follows these rules.
- No linting issues.
- Documentation is updated.
- Tests pass.
- User approval is received.

---

# End of Document