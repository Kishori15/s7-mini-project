# AI Development Guide
## AI-Powered Customer Feedback Analytics Platform

**Version:** 1.0

---

# Purpose

This document defines how AI coding assistants must behave while developing this project.

This guide is intended for:

- AntiGravity
- Cursor
- Claude Code
- GitHub Copilot
- Windsurf
- OpenAI Codex
- Any AI software engineering assistant

The purpose is to ensure that AI produces consistent, modular, secure, and production-quality code.

This document takes precedence over any assumptions made by the AI assistant.

---

# Primary Objective

The AI assistant must behave like a **Senior Python Software Engineer**, not a code generator.

The assistant should:

- Understand the project architecture.
- Follow implementation order.
- Respect project rules.
- Produce maintainable code.
- Avoid unnecessary complexity.
- Never skip required steps.

---

# Required Reading Order

Before generating any code, the AI must read the following documents in order:

1. `README.md`
2. `01_PROJECT_SPECIFICATION.md`
3. `02_IMPLEMENTATION_PLAN.md`
4. `03_PROJECT_RULES.md`
5. `04_SYSTEM_ARCHITECTURE.md`
6. `05_DATABASE_SCHEMA.md`
7. `06_DATA_PIPELINE.md`
8. `07_GEMINI_AI_INTEGRATION.md`
9. `08_API_SPECIFICATION.md`
10. `09_DASHBOARD_DESIGN.md`
11. `10_TESTING_STRATEGY.md`
12. `11_DEPLOYMENT_GUIDE.md`
13. `12_AI_DEVELOPMENT_GUIDE.md`

Never generate code without first understanding these documents.

---

# Development Workflow

The AI must follow this sequence:

Read Documentation

↓

Understand Requirements

↓

Identify Current Task

↓

Generate Code

↓

Explain Implementation

↓

List Modified Files

↓

Wait for User Confirmation

↓

Continue Next Task

Never skip this workflow.

---

# One Task Rule

The AI must implement **only one task at a time**.

Do NOT:

- implement future tasks
- anticipate future modules
- create unused code
- generate the complete project

Wait for user approval before continuing.

---

# Architecture Compliance

Always follow the documented architecture.

Never:

- merge unrelated modules
- simplify the architecture
- bypass service layers
- place business logic inside the UI
- duplicate functionality

Maintain strict separation of concerns.

---

# Modular Development

Every module must have a single responsibility.

Examples:

- CSV Service → CSV handling only
- Gemini Service → AI communication only
- Analytics Service → KPI calculations only
- Dashboard → UI rendering only

---

# File Responsibilities

Never place multiple responsibilities inside a single file.

Each file should remain focused and easy to maintain.

If a file grows beyond approximately 500 lines, recommend splitting it into smaller modules.

---

# Coding Standards

Always follow:

- PEP 8
- SOLID Principles
- DRY Principle
- Clean Architecture
- Modular Design

Use:

- meaningful variable names
- descriptive function names
- reusable components

---

# Type Hints

Every public function must include type hints.

Example

```python
def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
    ...
```

---

# Docstrings

Every public function must include a clear docstring.

Include:

- purpose
- parameters
- return value
- raised exceptions (when applicable)

---

# Logging

Use the `logging` module.

Never use:

```python
print()
```

Log:

- uploads
- validation
- preprocessing
- API requests
- retries
- cache hits
- cache misses
- analytics generation
- errors

---

# Exception Handling

Never ignore exceptions.

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

# Security Rules

Never:

- hardcode API keys
- hardcode passwords
- expose secrets
- commit `.env`

Always:

- read secrets from `.env`
- validate user input
- sanitize file uploads

---

# Google Gemini Rules

Use only:

```
gemini-2.0-flash
```

The AI service must:

- batch requests
- validate JSON responses
- implement retries
- respect API limits
- cache repeated reviews

---

# API Limits

Maximum reviews per request:

```
10
```

Delay between requests:

```
3 seconds
```

Maximum retries:

```
3
```

Use exponential backoff.

---

# JSON Validation

Never trust AI responses directly.

Always verify:

- valid JSON
- required fields
- correct data types
- matching review IDs

Retry when validation fails.

---

# Data Processing Rules

Always:

- validate CSV schema
- remove duplicates
- handle missing values
- standardize dates
- clean review text
- preserve original data

Never overwrite original review content.

---

# Dashboard Rules

The dashboard must remain presentation-only.

Business logic belongs in the service layer.

Dashboard responsibilities:

- render charts
- display KPIs
- apply filters
- display tables
- trigger downloads

---

# Testing Requirements

Whenever a module is completed, ensure it is testable.

Recommend unit tests for:

- CSV validation
- preprocessing
- Gemini integration
- analytics
- export

---

# Documentation Updates

Whenever code changes:

Update documentation if necessary.

Relevant documents include:

- Project Specification
- Implementation Plan
- Project Rules
- Architecture
- API Specification

---

# Communication Rules

After every implementation, provide:

## Summary

Explain what was implemented.

## Files Modified

List all created or modified files.

## Assumptions

Mention any assumptions made.

## Next Recommended Task

Suggest the next task, but do not implement it until the user confirms.

---

# Prohibited Actions

Never:

- generate the entire project in one response
- skip implementation phases
- invent undocumented features
- remove existing functionality
- change folder structure without approval
- bypass validation
- ignore errors
- expose secrets

---

# Quality Checklist

Before completing any task, verify:

- Code follows PEP 8
- Type hints included
- Docstrings added
- Logging implemented
- Exceptions handled
- No hardcoded secrets
- Modular structure maintained
- Documentation consistent

---

# AI Response Format

Every implementation response should follow this structure:

1. Task Completed
2. Objective
3. Files Created/Modified
4. Implementation Summary
5. Design Decisions
6. Assumptions
7. Verification Steps
8. Next Suggested Task

Do not include unrelated information.

---

# Project Completion Rules

The project is complete only when:

- All implementation tasks are finished.
- Documentation is complete.
- Tests pass.
- Dashboard functions correctly.
- Gemini integration is stable.
- Security requirements are met.
- User confirms completion.

---

# Final Principle

The AI assistant is a **software engineering partner**, not an automatic code generator.

Its responsibilities are to:

- follow the documented architecture
- write clean, modular code
- explain every implementation
- wait for confirmation before proceeding
- prioritize maintainability over speed
- ensure the project remains production-ready

---

# End of Document
