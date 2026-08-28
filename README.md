# 📊 AI-Powered Customer Feedback Analytics Platform

An AI-powered analytics platform that automatically analyzes customer reviews using **Google Gemini**, generates meaningful business insights, and presents the results through an interactive **Streamlit** dashboard.

---

## 🎯 Features

- **CSV Upload** — Upload customer review datasets
- **Data Cleaning** — Automated preprocessing and validation
- **AI Analysis** — Sentiment, complaint categorization, priority, and keyword extraction via Google Gemini
- **Interactive Dashboard** — KPI cards, charts, filters, and search
- **Review Explorer** — Browse, search, and filter individual reviews
- **Export** — Download AI-enriched processed datasets

---

## 🛠 Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Python 3.11+ |
| Dashboard | Streamlit |
| Charts | Plotly |
| Data Processing | Pandas |
| AI | Google Gemini (gemini-2.0-flash) |
| Configuration | python-dotenv |

---

## 📂 Project Structure

```
feedback_management/
├── docs/               # Project documentation
├── src/                # Source code
│   ├── app.py          # Application entry point
│   ├── config/         # Configuration, logging, constants
│   ├── services/       # Business logic services
│   ├── utils/          # Helper utilities
│   ├── pages/          # Streamlit dashboard pages
│   ├── charts/         # Reusable Plotly chart components
│   ├── models/         # Data models and schemas
│   └── reports/        # Report generation
├── data/               # Datasets (raw, processed, cache)
├── assets/             # Static files
├── tests/              # Unit and integration tests
├── logs/               # Application logs
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
└── .gitignore          # Git exclusion rules
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11 or higher
- Google Gemini API key

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/feedback_management.git
cd feedback_management

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Run the Application

```bash
streamlit run app.py
```

Open `http://localhost:8501` in your browser.

---

## 🧪 Running Tests

```bash
pytest
```

---

## 📖 Documentation

Complete project documentation is available in the `docs/` directory:

| Document | Purpose |
|----------|---------|
| [README](docs/README.md) | Documentation index |
| [Project Specification](docs/01_PROJECT_SPECIFICATION.md) | Requirements |
| [Implementation Plan](docs/02_IMPLEMENTATION_PLAN.md) | Development roadmap |
| [Project Rules](docs/03_PROJECT_RULES.md) | Coding standards |
| [System Architecture](docs/04_SYSTEM_ARCHITECTURE.md) | Architecture design |
| [Database Schema](docs/05_DATABASE_SCHEMA.md) | Data model |
| [Data Pipeline](docs/06_DATA_PIPELINE.md) | Processing workflow |
| [Gemini Integration](docs/07_GEMINI_AI_INTEGRATION.md) | AI integration |
| [API Specification](docs/08_API_SPECIFICATION.md) | Service interfaces |
| [Dashboard Design](docs/09_DASHBOARD_DESIGN.md) | UI design |
| [Testing Strategy](docs/10_TESTING_STRATEGY.md) | Testing approach |
| [Deployment Guide](docs/11_DEPLOYMENT_GUIDE.md) | Deployment instructions |
| [AI Dev Guide](docs/12_AI_DEVELOPMENT_GUIDE.md) | AI assistant rules |

---

## 📝 License

This project is for educational and portfolio purposes.
