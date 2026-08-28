# Coding Prompts
## AI-Powered Customer Feedback Analytics Platform

**Version:** 1.0

---

# Purpose

This document contains standardized prompts for AI coding assistants.

Supported AI Assistants:

- AntiGravity
- Cursor
- Claude Code
- GitHub Copilot
- Windsurf
- OpenAI Codex
- ChatGPT

These prompts ensure that every generated module follows the same architecture, coding standards, and implementation workflow.

---

# General Instructions (Use Before Every Prompt)

Read the following documents before generating any code:

1. README.md
2. 01_PROJECT_SPECIFICATION.md
3. 02_IMPLEMENTATION_PLAN.md
4. 03_PROJECT_RULES.md
5. 04_SYSTEM_ARCHITECTURE.md
6. 05_DATABASE_SCHEMA.md
7. 06_DATA_PIPELINE.md
8. 07_GEMINI_AI_INTEGRATION.md
9. 08_API_SPECIFICATION.md
10. 09_DASHBOARD_DESIGN.md
11. 10_TESTING_STRATEGY.md
12. 11_DEPLOYMENT_GUIDE.md
13. 12_AI_DEVELOPMENT_GUIDE.md

Follow every rule defined in these documents.

Never skip documentation.

Never generate the complete project at once.

Implement only the requested module.

Always wait for confirmation before continuing.

---

# Master Prompt

Use this prompt before generating any code.

```
You are a Senior Python Software Engineer.

Develop this project strictly according to the documentation inside the docs/ folder.

Follow:

- Clean Architecture
- Modular Design
- SOLID Principles
- PEP8
- DRY Principle

Use Python 3.11.

Frontend:
- Streamlit

Data Processing:
- Pandas

Charts:
- Plotly

AI:
- Google Gemini (gemini-2.0-flash)

Never hardcode API keys.

Read API keys from .env.

Implement only ONE task.

Do not implement future modules.

Add type hints.

Add docstrings.

Use logging.

Handle exceptions properly.

Explain your implementation.

List modified files.

Wait for confirmation before continuing.
```

---

# Prompt 1 – Generate Project Structure

```
Read the project documentation.

Generate only the folder structure.

Do not generate application logic.

Create all folders and placeholder files.

Follow the architecture exactly.

Return only the project structure.
```

---

# Prompt 2 – Generate Requirements

```
Generate requirements.txt.

Include only required dependencies.

Avoid unnecessary packages.

Group dependencies logically.

Explain why each package is required.
```

---

# Prompt 3 – Create Configuration Module

```
Generate the configuration module.

Requirements:

- Load .env
- Configure logging
- Read Gemini API key
- Validate configuration
- Raise meaningful errors

Do not implement any business logic.
```

---

# Prompt 4 – CSV Upload Module

```
Generate csv_service.py.

Responsibilities:

- Upload CSV
- Validate CSV
- Detect missing columns
- Validate rating values
- Handle invalid files
- Return DataFrame

Include:

- Type hints
- Logging
- Docstrings
- Exception handling

Do not generate AI logic.
```

---

# Prompt 5 – Data Cleaning Module

```
Generate preprocessing.py.

Implement:

- Remove duplicates
- Handle missing values
- Trim whitespace
- Normalize ratings
- Standardize dates
- Clean review text

Keep original dataset unchanged.

Use Pandas best practices.
```

---

# Prompt 6 – Feature Generation

```
Generate feature_engineering.py.

Generate:

- review_length
- month
- year
- cleaned_review

Return updated DataFrame.

Do not call Gemini.
```

---

# Prompt 7 – Gemini Integration

```
Generate gemini_service.py.

Requirements:

- Use gemini-2.0-flash
- Read API key from .env
- Batch reviews
- Retry on failure
- Exponential backoff
- Validate JSON
- Cache responses
- Respect rate limits

Never hardcode secrets.
```

---

# Prompt 8 – Analytics Engine

```
Generate analytics_service.py.

Calculate:

- Total Reviews
- Positive Reviews
- Neutral Reviews
- Negative Reviews
- Average Rating
- Product Analytics
- Brand Analytics
- Complaint Categories

Return reusable metrics.
```

---

# Prompt 9 – Dashboard

```
Generate Streamlit dashboard.

Include:

- Sidebar
- KPI Cards
- Filters
- Pie Charts
- Bar Charts
- Line Charts
- Review Explorer
- Download Button

Business logic must remain inside services.
```

---

# Prompt 10 – Charts

```
Generate reusable Plotly chart components.

Create:

- Pie Chart
- Bar Chart
- Line Chart
- Rating Distribution
- Complaint Analysis

Charts must be modular.
```

---

# Prompt 11 – Export Module

```
Generate export_service.py.

Allow:

- Download Processed CSV

Prepare architecture for future:

- PDF Export
- Excel Export

Keep implementation modular.
```

---

# Prompt 12 – Logging Module

```
Generate logger.py.

Configure:

- Console logging
- File logging
- Log formatting
- Rotation support

No print() statements.
```

---

# Prompt 13 – Testing

```
Generate unit tests.

Use pytest.

Cover:

- CSV Upload
- Validation
- Cleaning
- Gemini Integration
- Analytics

Do not generate integration tests yet.
```

---

# Prompt 14 – Code Review

```
Review the generated code.

Check:

- PEP8
- Type hints
- Docstrings
- Logging
- Exception handling
- SOLID
- DRY
- Security

List improvements.

Do not rewrite unless necessary.
```

---

# Prompt 15 – Refactoring

```
Refactor the current module.

Requirements:

- Improve readability
- Reduce duplication
- Maintain behavior
- Preserve architecture
- Improve documentation

Explain every change.
```

---

# Prompt 16 – Bug Fix

```
Analyze the reported bug.

Identify:

- Root cause
- Impact
- Solution

Implement only the required fix.

Do not modify unrelated code.
```

---

# Prompt 17 – Documentation Update

```
Review the current implementation.

Update documentation if required.

Do not change functionality.

Keep Markdown formatting professional.
```

---

# Prompt 18 – Deployment Review

```
Verify deployment readiness.

Check:

- requirements.txt
- .env.example
- Logging
- Configuration
- Security
- Documentation

List any missing items.
```

---

# Prompt 19 – Final Project Review

```
Perform a complete project review.

Evaluate:

- Architecture
- Code Quality
- Security
- Documentation
- Testing
- Dashboard
- AI Integration

Provide a score out of 10.

List strengths, weaknesses, and recommended improvements.
```

---

# Prompt 20 – Continue Development

```
Continue from the previous completed task.

Read all documentation.

Do not regenerate existing files.

Implement only the next task from IMPLEMENTATION_PLAN.md.

Explain what was completed.

Wait for confirmation before continuing.
```

---

# AI Output Format

Every AI response should follow this structure:

1. Objective
2. Files Created
3. Files Modified
4. Implementation Details
5. Assumptions
6. Verification Steps
7. Next Recommended Task

---

# Development Rules

Always:

- Follow project documentation.
- Respect folder structure.
- Use modular architecture.
- Use type hints.
- Add docstrings.
- Handle exceptions.
- Use logging.
- Read secrets from .env.
- Wait for user approval before continuing.

Never:

- Hardcode API keys
- Skip validation
- Generate unnecessary code
- Break architecture
- Mix UI and business logic
- Modify unrelated files

---

# Best Practices

- Keep modules under 500 lines.
- Write reusable functions.
- Avoid duplicate logic.
- Validate all inputs.
- Log important events.
- Cache repeated AI requests.
- Test every module before moving to the next.

---

# End of Document
