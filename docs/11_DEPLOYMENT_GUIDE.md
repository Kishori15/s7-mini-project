# Deployment Guide
## AI-Powered Customer Feedback Analytics Platform

**Version:** 1.0

---

# Purpose

This document describes how to install, configure, run, and deploy the AI-Powered Customer Feedback Analytics Platform.

It covers:

- System Requirements
- Installation
- Virtual Environment
- Environment Variables
- Dependency Installation
- Running the Application
- Project Structure
- Deployment Options
- Docker (Future)
- Production Deployment
- Troubleshooting

---

# System Requirements

## Minimum Requirements

| Component | Requirement |
|------------|-------------|
| Operating System | Windows 10/11, Linux, macOS |
| Python | 3.11 or higher |
| RAM | 4 GB |
| Storage | 1 GB Free |
| Internet | Required for Gemini API |

---

## Recommended Requirements

| Component | Recommendation |
|------------|----------------|
| Python | 3.11+ |
| RAM | 8 GB |
| CPU | Dual Core or Higher |
| Browser | Chrome / Edge |
| IDE | Visual Studio Code |

---

# Required Software

Install the following software before running the project.

- Python 3.11+
- Git
- Visual Studio Code
- Google Chrome (recommended)

---

# Clone Repository

```bash
git clone https://github.com/your-username/customer-feedback-dashboard.git

cd customer-feedback-dashboard
```

---

# Create Virtual Environment

## Windows

```bash
python -m venv venv
```

Activate

```bash
venv\Scripts\activate
```

---

## Linux / macOS

```bash
python3 -m venv venv
```

Activate

```bash
source venv/bin/activate
```

---

# Install Dependencies

```bash
pip install --upgrade pip

pip install -r requirements.txt
```

---

# Environment Variables

Create a file named

```
.env
```

Example

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

---

# .env.example

Commit only

```
.env.example
```

Example

```env
GEMINI_API_KEY=
```

Never commit

```
.env
```

---

# Project Structure

```
customer-feedback-dashboard/

│
├── assets/
├── data/
│   ├── raw/
│   ├── processed/
│   └── cache/
│
├── docs/
├── logs/
├── src/
├── tests/
│
├── .env
├── .env.example
├── requirements.txt
└── README.md
```

---

# Verify Installation

Check Python

```bash
python --version
```

Check Pip

```bash
pip --version
```

List Installed Packages

```bash
pip list
```

---

# Run the Application

Navigate to project root

```bash
cd customer-feedback-dashboard
```

Launch Streamlit

```bash
streamlit run app.py
```

Expected Output

```
Local URL:

http://localhost:8501
```

Open the URL in your browser.

---

# Running Tests

Execute all tests

```bash
pytest
```

Run specific test

```bash
pytest tests/test_csv_service.py
```

---

# Logging

Application logs are stored in

```
logs/
```

Example

```
application.log
```

---

# Data Storage

```
data/

raw/
processed/
cache/
```

Descriptions

- **raw/** → Original uploaded datasets
- **processed/** → AI enriched datasets
- **cache/** → Cached Gemini responses

---

# Updating Dependencies

Install new package

```bash
pip install package_name
```

Update requirements

```bash
pip freeze > requirements.txt
```

---

# Production Deployment

## Option 1 – Streamlit Community Cloud

Steps

1. Push project to GitHub
2. Connect repository to Streamlit Cloud
3. Configure environment variables
4. Deploy

---

## Option 2 – Render

Steps

1. Create Render account
2. Connect GitHub repository
3. Configure build command

```bash
pip install -r requirements.txt
```

Start command

```bash
streamlit run src/app.py
```

---

## Option 3 – Railway

Steps

1. Connect GitHub
2. Add environment variables
3. Deploy

---

## Option 4 – VPS Deployment

Requirements

- Ubuntu Server
- Python 3.11+
- Nginx (optional)
- Systemd service (optional)

---

# Docker (Future)

Example Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

EXPOSE 8501

CMD ["streamlit", "run", "src/app.py"]
```

---

# Docker Compose (Future)

```yaml
version: "3.9"

services:
  dashboard:
    build: .
    ports:
      - "8501:8501"
    env_file:
      - .env
```

---

# Environment Variable Management

Required Variables

| Variable | Description |
|----------|-------------|
| GEMINI_API_KEY | Google Gemini API Key |

Optional Variables

| Variable | Description |
|----------|-------------|
| LOG_LEVEL | Logging level |
| CACHE_ENABLED | Enable cache |
| BATCH_SIZE | Reviews per API batch |

---

# Security Guidelines

Always

- Use `.env`
- Ignore `.env` in Git
- Rotate API keys if compromised
- Keep dependencies updated

Never

- Hardcode API keys
- Commit secrets
- Expose credentials in logs

---

# Backup Strategy

Backup

- Processed CSV
- Raw CSV
- Cache
- Logs

Recommended Frequency

- Weekly
- Before major updates

---

# Troubleshooting

## ModuleNotFoundError

Solution

```bash
pip install -r requirements.txt
```

---

## Gemini API Authentication Error

Check

- API key exists
- `.env` is loaded
- Key is valid

---

## Streamlit Not Found

Install

```bash
pip install streamlit
```

---

## Port Already in Use

Run

```bash
streamlit run src/app.py --server.port 8502
```

---

## API Quota Exceeded

Recommended

- Wait until quota resets
- Resume from saved progress
- Reduce batch size

---

# Maintenance

Regular Tasks

- Update dependencies
- Clear cache
- Rotate API keys
- Archive logs
- Backup datasets

---

# Deployment Checklist

Before deployment verify:

- Python installed
- Virtual environment created
- Dependencies installed
- `.env` configured
- Gemini API working
- CSV upload working
- Dashboard loading correctly
- Export working
- Logs generated
- Tests passing

---

# Future Enhancements

Planned deployment improvements

- Docker Support
- Kubernetes Deployment
- CI/CD using GitHub Actions
- Automatic Testing Pipeline
- Cloud Storage Integration
- PostgreSQL Deployment
- HTTPS Reverse Proxy
- Monitoring with Prometheus
- Grafana Dashboard

---

# Definition of Done

Deployment is considered complete when:

- Application installs successfully.
- Environment variables are configured.
- Dependencies install without errors.
- Dashboard launches successfully.
- Gemini API is functional.
- Tests pass.
- Logs are generated.
- Documentation is complete.

---

# End of Document