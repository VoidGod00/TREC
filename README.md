# TREC — Transaction & Expense Controller

> Enterprise-grade personal finance tracker with AI-powered insights, real-time analytics, and a beautiful dark-mode React UI.

[![CI/CD](https://github.com/your-org/trec/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/trec/actions)
[![Coverage](https://codecov.io/gh/your-org/trec/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/trec)

---

## Features

| Pillar | What it does |
|---|---|
| **Expense Tracking** | Full CRUD — add, edit, delete, search, filter, paginate transactions |
| **Analytics Dashboard** | Category breakdown, monthly trends, budget vs actual, savings rate |
| **AI Assistant** | Ask natural language questions; auto-categorization; proactive insights |
| **Security** | JWT access + refresh tokens, bcrypt hashing, account lockout, per-user data isolation |
| **Enterprise Ready** | Connection pooling, Redis caching, Nginx rate limiting, Docker Compose, CI/CD |

---

## Architecture

```
Browser (React + Redux)
        │  HTTPS
        ▼
   Nginx (reverse proxy, rate-limiting, TLS termination)
        │
    ┌───┴────────────────┐
    │                    │
    ▼                    ▼
FastAPI (8000)      Static Files (React build)
    │
    ├── PostgreSQL (primary DB, connection pool)
    ├── Redis (caching, rate limit state)
    └── Anthropic API (Claude AI)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 16 (pooled via SQLAlchemy QueuePool) |
| **Cache** | Redis 7 |
| **AI** | Anthropic Claude (claude-sonnet-4) |
| **Frontend** | React 18, Redux Toolkit, React Router 6, Recharts |
| **Auth** | JWT (access + refresh), bcrypt (12 rounds) |
| **Infra** | Docker Compose, Nginx, GitHub Actions CI/CD |
| **Testing** | pytest + pytest-cov (backend), Vitest (frontend) |

---

## Project Structure

```
TREC/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings from env vars
│   │   │   ├── security.py       # JWT + bcrypt utilities
│   │   │   └── logging.py        # Structured JSON logging
│   │   ├── models/
│   │   │   ├── user.py           # SQLAlchemy User model
│   │   │   ├── transaction.py    # Transaction + enums
│   │   │   └── budget.py         # Budget + AILog models
│   │   ├── schemas/
│   │   │   ├── auth.py           # Pydantic request/response schemas
│   │   │   ├── transaction.py
│   │   │   ├── budget.py
│   │   │   └── analytics.py
│   │   ├── services/
│   │   │   ├── auth_service.py   # Registration, login, lockout logic
│   │   │   ├── transaction_service.py  # CRUD + filtering
│   │   │   ├── analytics_service.py    # Dashboard calculations
│   │   │   └── ai_service.py     # Claude API integration
│   │   ├── routes/
│   │   │   ├── auth.py           # POST /auth/register, login, refresh
│   │   │   ├── transactions.py   # CRUD /transactions
│   │   │   ├── analytics.py      # GET /analytics/dashboard
│   │   │   └── ai.py             # POST /ai/ask, /ai/categorize
│   │   ├── middleware/
│   │   │   └── rate_limit.py     # SlowAPI rate limiter
│   │   ├── database.py           # Engine + session factory + get_db
│   │   └── main.py               # FastAPI app, CORS, error handlers
│   ├── alembic/                  # Database migrations
│   ├── tests/
│   │   ├── conftest.py           # Fixtures, test DB, factories
│   │   ├── test_auth.py          # Auth unit + integration tests
│   │   ├── test_transactions.py  # Transaction tests
│   │   ├── test_analytics.py     # Analytics calculation tests
│   │   └── test_ai.py            # AI service tests (mocked)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # Button, Input, Card, Modal, Badge, StatCard
│   │   │   ├── layout/           # Sidebar + topbar Layout
│   │   │   └── modals/       
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── TransactionsPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── AIAssistantPage.jsx
│   │   │   ├── Landingpage.jsx
│   │   │   ├── NotFoundPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── store/
│   │   │   ├── index.js          # Redux store
│   │   │   └── slices/           # authSlice, transactionSlice, analyticsSlice, uiSlice
│   │   ├── services/
│   │   │   └── api.js            # Axios instance + auto-refresh interceptor
│   │   └── test/
│   │       └── store.test.js     # Redux slice unit tests
│   ├── Dockerfile
│   └── vite.config.js
│
├── nginx/
│   └── nginx.conf                # Reverse proxy, rate limiting, TLS
├── scripts/
│   └── seed.py                   # Dev data seeder
├── .github/workflows/ci.yml      # GitHub Actions CI/CD
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/your-org/trec.git
cd TREC
cp .env.example .env
# Edit .env — set SECRET_KEY, ANTHROPIC_API_KEY, POSTGRES_PASSWORD
```

### 2. Generate a secret key

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Start with Docker Compose

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (dev) | http://localhost:8000/docs |

### 4. Seed demo data (optional)

```bash
docker compose exec backend python /app/../scripts/seed.py
# Login: demo@trec.com / Demo@1234
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Set env vars
export DATABASE_URL="postgresql://user:pass@localhost:5432/trec_db"
export SECRET_KEY="your-secret-key"
export ANTHROPIC_API_KEY="sk-ant-..."

# Run migrations
alembic upgrade head

# Start server (hot reload)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

---

## Running Tests

### Backend

```bash
cd backend
pytest                          # All tests
pytest tests/test_auth.py -v    # Single file
pytest --cov=app --cov-report=html  # With HTML coverage report
```

Expected coverage: **>80%** across all services.

### Frontend

```bash
cd frontend
npm test                        # Run once
npm run test:watch              # Watch mode
npm run test:coverage           # With coverage
```

---

## API Reference

All routes are prefixed with `/api/v1`.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login → tokens |
| POST | `/auth/refresh` | Refresh access token |
| GET  | `/auth/me` | Current user profile |
| PUT  | `/auth/change-password` | Change password |

### Transactions
| Method | Route | Description |
|---|---|---|
| POST | `/transactions` | Add transaction |
| GET  | `/transactions` | List with filters + pagination |
| GET  | `/transactions/{id}` | Get by ID |
| PUT  | `/transactions/{id}` | Update |
| DELETE | `/transactions/{id}` | Delete |

**Filter params:** `type`, `category`, `date_from`, `date_to`, `min_amount`, `max_amount`, `search`, `is_recurring`, `page`, `page_size`

### Analytics
| Method | Route | Description |
|---|---|---|
| GET  | `/analytics/dashboard` | Full dashboard data |
| POST | `/analytics/budgets` | Set monthly budget |
| GET  | `/analytics/budgets` | Get budgets |

### AI
| Method | Route | Description |
|---|---|---|
| POST | `/ai/ask` | Ask AI a finance question |
| POST | `/ai/categorize` | Auto-categorize a description |
| GET  | `/ai/insights` | Get proactive insights |
| GET  | `/ai/history` | AI conversation history |

---

## Security Architecture

- **Passwords** — bcrypt with 12 rounds (configurable)
- **Tokens** — RS256-signed JWTs; short-lived access (30 min) + long-lived refresh (7 days)
- **Brute-force protection** — Account locked for 15 min after 5 failed login attempts
- **Rate limiting** — 60 req/min general, 10 req/min for AI endpoints, 20 req/min for auth
- **Data isolation** — All queries filter by `user_id`; ownership verified on every operation
- **CORS** — Explicit allow-list of origins
- **TLS** — HTTPS enforced via Nginx; HTTP → HTTPS redirect
- **SQL injection** — SQLAlchemy ORM with parameterised queries throughout
- **Secrets** — All via environment variables, never hardcoded

---

## Deployment (Production)

### Environment checklist
- [ ] Strong `SECRET_KEY` (32+ random bytes)
- [ ] `ANTHROPIC_API_KEY` set
- [ ] `POSTGRES_PASSWORD` is unique and strong
- [ ] `ALLOWED_ORIGINS` contains only your actual domain
- [ ] TLS certificate placed at `nginx/ssl/cert.pem` and `nginx/ssl/key.pem`
- [ ] `DEBUG=false` and `ENVIRONMENT=production`

### Deploy with Docker Compose

```bash
# On your server
git clone ... && cd TREC
cp .env.example .env && nano .env   # fill in all values
docker compose up -d
docker compose exec backend alembic upgrade head
```

### Managed options
- **Backend** → Railway, Render, Fly.io
- **Frontend** → Vercel (set `VITE_API_URL` env var)
- **Database** → Supabase, Neon, Railway Postgres
- **Redis** → Upstash

---

## AI Capabilities

The AI assistant is powered by **Claude** (Anthropic) and has full read access to the user's transaction history. It can answer questions like:

- *"How much did I spend on food this month?"*
- *"Compare my spending this month vs last month"*
- *"Where can I save ₹5,000 per month?"*
- *"Am I on track with my rent budget?"*
- *"Create a plan to save ₹1,00,000 in 6 months"*
- *"Which subscriptions am I paying for?"*

Auto-categorization uses Claude Haiku for fast, cheap classification of transaction descriptions.

---

## Contributing

1. Fork → create feature branch: `git checkout -b feat/my-feature`
2. Make changes + add tests
3. Ensure `pytest` and `npm test` pass
4. Open a PR against `develop`

---

## License

MIT License — see [LICENSE](LICENSE).
