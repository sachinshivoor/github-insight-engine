# 🚀 GitHub Insight Engine

An elite, full-stack, AI-powered analytics engine and learning recommendation system. Processes any public GitHub repository or technology topic to generate deep, interactive architectural assessments, code quality metrics, documentation scoring, commit timelines, and personalized learning roadmaps — with full user authentication and persistent, scoped data storage.

Designed with a **premium dark-first glassmorphism UI**, the frontend is built using standard ES Modules (Vanilla JS) served statically by an asynchronous **FastAPI backend** running SQLite.

---

## ✨ Features

- **🔗 Repository Analytics Pipeline**
  - Parses GitHub URLs and fetches metadata, languages, contributors, commit history, file trees, and READMEs.
  - Generates top-contributor rankings with commit distributions.
  - Visualizes weekly/monthly commit frequency via Chart.js.

- **🏗️ Structural & Architectural Audits**
  - Scans folder hierarchies for tests, docs, CI/CD, Docker, and Kubernetes configs.
  - Scores repository structure, documentation, and code quality on a 0–10 scale.

- **🤖 Gemini-Powered AI Insights**
  - Evaluates health, complexity, portfolio value, and beginner-friendliness.
  - Generates concrete improvement suggestions and architectural assessments.

- **💡 Topic / Technology Mode**
  - Enter any topic (e.g., "Machine Learning", "FastAPI") to generate a complete learning roadmap, required skills, career paths, and popular tools.

- **🎓 Personalized Learning Resources**
  - Recommends real articles, videos, courses, and tutorials based on the detected tech stack.

- **🔐 User Authentication System**
  - Optional account registration and login using PBKDF2 HMAC SHA-256 (no native C bindings — works on any OS).
  - 7-day server-side session tokens stored in SQLite via the `UserSession` model.
  - Guest users can still use all features without signing in.
  - Signed-in users get scoped search history and saved reports.

- **📄 Premium Exports**
  - Export as a professional multi-page **PDF** with a cover page, metrics, and AI insights.
  - Export raw **JSON** for programmatic use.

- **🕒 Search History & Saved Reports**
  - Automatically persists search history per user (or as guest) to SQLite.
  - Save any full analysis as a named report, retrievable at any time.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Vanilla HTML5, Vanilla CSS3 (Glassmorphism, Dark-First), ES Modules, Lucide Icons, Chart.js, jsPDF, html2canvas |
| Backend | FastAPI (Python 3.11+), SQLAlchemy 2.x + aiosqlite, Google Generative AI (Gemini), Pydantic v2 |
| Auth | PBKDF2 HMAC SHA-256 (Python `hashlib`) + SQLite session tokens |
| Deploy | Docker, Docker Compose |

---

## 🏃 Getting Started

### Option 1: Local Development (Recommended)

#### Prerequisites
- **Python 3.11+** (Python 3.14 also supported)
- (Optional) A **GitHub Personal Access Token** — prevents API rate limits
- (Optional) A **Google Gemini API Key** — required for AI insights

#### Steps

```bash
# 1. Navigate into the project
cd "github insight"

# 2. Set up a virtual environment (recommended)
cd backend
py -m venv venv
.\venv\Scripts\activate       # Windows
# source venv/bin/activate    # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt --only-binary=:all:

# 4. (Optional) Configure your Gemini API key
#    Edit backend/.env and set GEMINI_API_KEY=your_key_here

# 5. Start the server
py main.py
```

The server starts at **`http://localhost:8000`** and serves both the API and the frontend from a single process.

---

### Option 2: Docker Compose

```bash
# From the project root directory
docker-compose up --build
```

Open **`http://localhost:8000`** in your browser.

---

## ⚙️ Configuration

Click the **Settings** icon in the sidebar or top header:

| Setting | Description |
|---|---|
| GitHub Token | Personal Access Token for higher API rate limits (60 → 5000 req/hour) |
| Gemini API Key | Required for AI-powered analysis. Get one free at [aistudio.google.com](https://aistudio.google.com) |
| Backend URL | Defaults to `http://localhost:8000` |

---

## 🔐 Authentication

Click the **user avatar** at the bottom of the sidebar to:
- **Sign In** with an existing account
- **Register** a new account (username 3–50 chars, password 6+ chars)
- **Sign Out** to clear your session

Guest users retain full access to all analysis features. Authentication adds:
- Persistent, account-scoped search history
- Saved reports tied to your account

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/ai/analyze` | Run AI analysis (repo or topic) |
| GET | `/api/history` | Get search history (scoped to user/guest) |
| POST | `/api/history` | Save a search to history |
| DELETE | `/api/history` | Clear all history |
| DELETE | `/api/history/{id}` | Delete one history entry |
| GET | `/api/reports` | List saved reports |
| POST | `/api/reports` | Save a report |
| GET | `/api/reports/{id}` | Get full report data |
| DELETE | `/api/reports/{id}` | Delete a report |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, receive session token |
| GET | `/api/auth/me` | Validate token, return user info |
| POST | `/api/auth/logout` | Revoke session token |

Interactive API docs available at **`http://localhost:8000/docs`**.

---

## 📂 Project Structure

```
github insight/
├── backend/
│   ├── models/
│   │   └── database.py        # SQLAlchemy models: User, UserSession, SearchHistory, SavedReport
│   ├── routers/
│   │   ├── auth.py            # Auth endpoints + PBKDF2 password hashing
│   │   ├── ai.py              # Gemini AI analysis endpoint
│   │   ├── history.py         # User-scoped search history CRUD
│   │   ├── reports.py         # User-scoped saved reports CRUD
│   │   └── health.py          # Health check
│   ├── schemas/
│   │   └── analysis.py        # Pydantic v2 request/response schemas
│   ├── services/
│   │   └── gemini_service.py  # Google Gemini API integration
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env                   # Set GEMINI_API_KEY here
│   └── main.py                # FastAPI app + static file serving
├── frontend/
│   ├── css/
│   │   └── app.css            # ~1600 lines of glassmorphic CSS
│   ├── js/
│   │   ├── main.js            # App controller, routing, auth wiring
│   │   ├── ui.js              # Full HTML rendering engine (~1064 lines)
│   │   ├── analyzer.js        # GitHub → AI analysis pipeline
│   │   ├── charts.js          # Chart.js wrappers (5 chart types)
│   │   ├── export.js          # PDF + JSON export
│   │   ├── github.js          # GitHub REST API client
│   │   └── store.js           # Reactive Proxy state store
│   └── index.html             # SPA shell with auth modal + sidebar
├── docker-compose.yml
└── README.md
```

---

## 📄 License

MIT License — open source and free to use.
