# Web Analyser — B2B Intelligence Platform

> Instantly extract structured intelligence from any company website: tech stack, go-to-market signals, and a customisable B2B SaaS fit score — powered by AI.

---

## Table of Contents

1. [Overview](#overview)
2. [Use Cases](#use-cases)
3. [Features](#features)
4. [Architecture & Stack](#architecture--stack)
5. [Project Structure](#project-structure)
6. [Local Setup (Docker)](#local-setup-docker)
7. [Local Setup (without Docker)](#local-setup-without-docker)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Deployment](#deployment)
11. [Security](#security)

---

## Overview

**Web Analyser** is a single-page web application that takes any company URL as input and returns a rich, structured analysis in seconds. It scrapes publicly available signals from the target website, feeds them to a large language model, and combines deterministic scoring with AI-generated insights to produce an actionable intelligence report.

The analysis covers four pillars:

| Pillar | What you get |
|---|---|
| **Company Identity** | Name, sector, business model, estimated headcount, headquarters, founding signal |
| **Tech Stack** | Frontend frameworks, analytics tools, marketing platforms, infrastructure providers |
| **GTM Signals** | Pricing page, demo CTA, free trial, blog activity, careers page, integrations, multilingual |
| **Fit Score** | 0–100 score with label, rationale, positive signals, and watch-out flags |

---

## Use Cases

### Competitive Intelligence
Map a competitor's entire tech stack and go-to-market motion in seconds. Understand whether they are product-led or sales-led, whether they are investing in content, whether they offer a free tier — and benchmark that against your own positioning.

### Self-Improvement Audit
Run your own website through the analyser. The fit score and signal breakdown will surface gaps in your public presence: a missing pricing page, a lack of integration listings, or a blog that hasn't been updated. Use it as a repeatable checklist to strengthen your GTM signals.

### Prospect Qualification
Before a sales call, generate a quick intelligence brief on any prospect. Understand their stack, their growth signals, and how well they fit your ideal customer profile — without spending an hour on manual research.

### Batch Analysis
Upload up to 50 URLs at once and export the results as a CSV. Ideal for market mapping, TAM segmentation, or preparing for an outbound campaign.

---

## Features

- **AI-powered analysis** — Claude (claude-sonnet-4-6) or Gemini (gemini-2.5-flash), auto-selected based on available API key
- **Customisable ICP scoring** — adjust the weight of each scoring criterion to match your ideal customer profile
- **Analysis history** — every analysis saved to your account, paginated, searchable
- **Bulk analysis** — up to 50 URLs per batch, processed asynchronously with live progress
- **PDF & JSON export** — download a formatted report or the raw data
- **User accounts** — register, log in, change email/password, delete account
- **French-first UI** with full English AI output for data fields
- **Mobile-responsive** layout
- **Rate limiting & security headers** — production-ready security baseline

---

## Architecture & Stack

### Why this stack?

**React + Vite (Frontend)**
React provides the component model needed to manage the multiple states of this app (loading, results, history, profile, modals) without complexity. Vite replaces Create React App with near-instant hot reload and a leaner build output. No SSR is needed — the app is fully client-rendered and served as static files.

**Node.js + Express (Backend)**
Express is deliberately minimal: it does not impose a framework structure that would add overhead for what is essentially a pipeline of three service calls (scrape → analyse → score). ES Modules are used throughout for consistency with modern JavaScript. Each concern (scraping, analysis, scoring, auth, history) lives in its own file with a clear interface.

**PostgreSQL (Database)**
PostgreSQL was chosen over SQLite or a NoSQL store for three reasons: the JSONB column type lets us store the full analysis result without defining a rigid schema upfront; the `ON DELETE CASCADE` foreign key constraint guarantees that deleting a user also deletes all their data atomically; and pg is a battle-tested driver with connection pooling out of the box.

**Anthropic Claude / Google Gemini (LLM)**
The analyser tries Claude first (if `ANTHROPIC_API_KEY` is set) and falls back to Gemini. Both models are capable of following a strict JSON schema output instruction. Claude is preferred for its stronger instruction-following on structured output. Both have retry logic with exponential backoff for transient overload errors.

**Docker Compose (Local & Production)**
Docker Compose orchestrates three containers — PostgreSQL, the Express server, and Nginx serving the React build — with a single command. Nginx acts as a reverse proxy, routing `/api/*` to the server container and serving static assets for everything else. This eliminates CORS issues in production and keeps the network internal.

**Cheerio (HTML Parsing)**
Cheerio is a server-side jQuery-like HTML parser. It is fast, dependency-light, and sufficient for extracting meta tags, script sources, link hrefs, nav links, and heading text — the signals that feed the AI analysis. A full headless browser would be overkill and much slower.

---

## Project Structure

```
web-analyser/
├── .env.example                 # Root env template (used by Docker Compose)
├── docker-compose.yml           # Orchestrates db + server + client containers
│
├── client/                      # React + Vite frontend
│   ├── Dockerfile               # Multi-stage: Vite build → Nginx serve
│   ├── nginx.conf               # Reverse proxy + SPA fallback
│   ├── index.html
│   └── src/
│       ├── api.js               # All API calls, token management, auth helpers
│       ├── defaultWeights.js    # Default ICP scoring weights (shared constant)
│       ├── App.jsx              # Root component, global state, tab routing
│       └── components/
│           ├── AuthModal.jsx    # Login / register form
│           ├── BulkUpload.jsx   # Multi-URL batch analysis + polling
│           ├── HistoryPanel.jsx # Paginated analysis history
│           ├── IcpWeights.jsx   # Collapsible ICP score customiser
│           ├── Loader.jsx       # Loading state with pipeline steps
│           ├── PasswordInput.jsx# Reusable password field with show/hide toggle
│           ├── ProfileModal.jsx # Account settings, FAQ, CGU
│           ├── ResultCard.jsx   # Full analysis display (4 sections)
│           ├── ScoreGauge.jsx   # Visual fit score with signals columns
│           └── UrlForm.jsx      # URL input and submit
│
└── server/                      # Node.js + Express backend
    ├── Dockerfile
    ├── index.js                 # App entry point: middleware, routes, DB migration
    ├── db/
    │   ├── index.js             # pg connection pool
    │   └── migrate.js           # Creates users, analyses, batch_jobs tables
    ├── middleware/
    │   └── requireAuth.js       # JWT guards: requireAuth and optionalAuth
    ├── routes/
    │   ├── account.js           # PUT /password, PUT /email, DELETE /account
    │   ├── analyze.js           # POST /analyze — main pipeline
    │   ├── auth.js              # POST /register, POST /login
    │   ├── batch.js             # POST /batch, GET /batch/:id
    │   ├── history.js           # GET /history (paginated), GET|DELETE /history/:id
    │   └── report.js            # POST /report/generate → PDF blob
    ├── services/
    │   ├── analyzer.js          # LLM call (Claude or Gemini) with retry logic
    │   ├── auth.js              # bcrypt hashing, JWT sign/verify
    │   ├── pdfGenerator.js      # pdfkit report generation
    │   ├── scorer.js            # Deterministic B2B fit scoring (0–100)
    │   └── scraper.js           # Axios fetch + Cheerio HTML signal extraction
    └── utils/
        ├── logger.js            # Structured JSON logger
        └── urlHelper.js         # URL normalisation, validation, SSRF protection
```

---

## Local Setup (Docker)

This is the recommended setup. It requires only Docker — no Node.js installation needed on your machine.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- An API key from either [Anthropic](https://console.anthropic.com/) or [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the repository

```bash
git clone <repository-url>
cd web-analyser
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# LLM — set at least one (Claude takes priority if both are set)
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=

# Database
POSTGRES_PASSWORD=choose-a-strong-password

# Auth
JWT_SECRET=generate-with--openssl-rand-base64-32
```

To generate a secure `JWT_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Start all services

```bash
docker compose up --build
```

This command:
- Pulls the PostgreSQL 16 image and starts the database
- Builds the Express server image and runs migrations
- Builds the React app and serves it through Nginx

The first build takes 2–4 minutes. Subsequent starts are much faster.

### 4. Open the app

Navigate to **[http://localhost:8080](http://localhost:8080)**.

Create an account, then enter any company URL (e.g. `stripe.com`) and click **Analyser**.

### Useful commands

```bash
# Start without rebuilding (faster)
docker compose up

# Rebuild a single service after code changes
docker compose up --build server
docker compose up --build client

# Stop all containers
docker compose down

# Stop and delete the database volume (full reset)
docker compose down -v

# View live server logs
docker compose logs -f server
```

---

## Local Setup (without Docker)

Use this approach if you want to run the frontend with hot reload during development.

### Prerequisites

- Node.js 20 or later
- PostgreSQL 16 (running locally or via a hosted service)

### 1. Database

Create a database and user:

```sql
CREATE DATABASE konsole;
CREATE USER konsole WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE konsole TO konsole;
```

### 2. Backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...   # or GEMINI_API_KEY
PORT=3001
DATABASE_URL=postgresql://konsole:yourpassword@localhost:5432/konsole
JWT_SECRET=your-jwt-secret
ALLOWED_ORIGINS=http://localhost:5173
```

```bash
npm install
node index.js
# Server runs on http://localhost:3001
# Database tables are created automatically on first start
```

### 3. Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL is already set to http://localhost:3001
npm install
npm run dev
# App runs on http://localhost:5173
```

---

## Environment Variables

### Root `.env` (Docker Compose)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | One of the two | Claude API key — takes priority over Gemini |
| `GEMINI_API_KEY` | One of the two | Google Gemini API key — used if no Claude key |
| `POSTGRES_PASSWORD` | Yes | Password for the PostgreSQL `konsole` user |
| `JWT_SECRET` | Yes | Secret used to sign authentication tokens — minimum 32 characters |

### Server `.env` (without Docker)

Adds `PORT`, `DATABASE_URL`, and `ALLOWED_ORIGINS` to the above.

### Client `.env` (without Docker)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | Base URL of the backend API |

---

## API Reference

All endpoints are prefixed with `/api`.

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Create account. Body: `{ email, password }` |
| `POST` | `/auth/login` | — | Login. Body: `{ email, password }`. Returns `{ token, email }` |

### Analysis

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/analyze` | Optional | Analyse a URL. Body: `{ url, weights? }`. Saves to history when authenticated |
| `POST` | `/report/generate` | — | Generate a PDF report. Body: `{ result }`. Returns a PDF blob |

### History

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/history?page=1` | Required | Paginated history (50 per page). Returns `{ items, page, totalPages, total }` |
| `GET` | `/history/:id` | Required | Full analysis result by ID |
| `DELETE` | `/history/:id` | Required | Delete an analysis |

### Batch

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/batch` | Required | Start a batch job. Body: `{ urls[], weights? }`. Returns `{ jobId }` |
| `GET` | `/batch/:id` | Required | Poll job status. Returns `{ status, processed, total, results[] }` |

### Account

| Method | Path | Auth | Description |
|---|---|---|---|
| `PUT` | `/account/password` | Required | Change password. Body: `{ currentPassword, newPassword }` |
| `PUT` | `/account/email` | Required | Change email. Body: `{ currentEmail, newEmail }` |
| `DELETE` | `/account/account` | Required | Delete account and all data. Body: `{ password }` |

---

## Deployment

Everything can be deployed on [Render](https://render.com) — no third-party platform needed. The stack maps naturally to three Render resources: a managed PostgreSQL database, a Docker web service for the backend, and a Docker web service (Nginx) for the frontend.

### Step 1 — PostgreSQL database

1. In the Render dashboard, go to **New → PostgreSQL**
2. Choose a name (e.g. `web-analyser-db`) and the free or starter plan
3. Once created, copy the **Internal Database URL** — you will need it in Step 2

### Step 2 — Backend (Express API)

1. Go to **New → Web Service**
2. Connect your repository
3. Set the following options:

   | Setting | Value |
   |---|---|
   | **Root directory** | `server` |
   | **Environment** | Docker |
   | **Dockerfile path** | `./Dockerfile` |

4. Add environment variables:

   | Variable | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | Your Claude key — or use `GEMINI_API_KEY` |
   | `DATABASE_URL` | Internal Database URL from Step 1 |
   | `JWT_SECRET` | Run `openssl rand -base64 32` to generate one |
   | `ALLOWED_ORIGINS` | Your frontend Render URL (fill in after Step 3) |
   | `PORT` | `3001` |

5. Deploy. The server will run migrations and create all tables on first start.

### Step 3 — Frontend (React + Nginx)

The client Dockerfile builds the React app and serves it through Nginx, which also proxies `/api` requests to the backend — so the frontend and backend can live on different Render URLs with no CORS issues.

1. Go to **New → Web Service**
2. Connect your repository
3. Set the following options:

   | Setting | Value |
   |---|---|
   | **Root directory** | `client` |
   | **Environment** | Docker |
   | **Dockerfile path** | `./Dockerfile` |

4. Add build argument:

   | Argument | Value |
   |---|---|
   | `VITE_API_URL` | Leave empty — Nginx handles `/api` proxying internally |

5. Deploy. Once live, copy the frontend URL (e.g. `https://web-analyser.onrender.com`).

### Step 4 — Wire CORS

Go back to the **backend** service on Render, update the `ALLOWED_ORIGINS` variable with your frontend URL, and redeploy:

```
ALLOWED_ORIGINS=https://web-analyser.onrender.com
```

> **Note on Nginx proxying**: `client/nginx.conf` is configured to proxy `/api/*` requests to the `server` container by hostname. On Render, the two services are not on the same Docker network, so you need to update `nginx.conf` to point to the public backend URL before deploying:
>
> ```nginx
> location /api/ {
>     proxy_pass https://your-api-service.onrender.com/api/;
> }
> ```

### Free tier considerations

Render's free tier spins down web services after 15 minutes of inactivity. The first request after a cold start may take 30–60 seconds. For a production deployment, use a paid instance or set up a simple uptime pinger (e.g. UptimeRobot pinging `/api/health` every 10 minutes).

---

## Security

| Measure | Implementation |
|---|---|
| **Security headers** | `helmet` middleware — sets X-Frame-Options, CSP, HSTS, X-Content-Type-Options |
| **Rate limiting** | 120 req / 15 min globally; 10 req / 15 min on auth endpoints |
| **SSRF protection** | All URLs validated against private IP ranges (127.x, 10.x, 192.168.x, 172.16–31.x, ::1) before any outbound request |
| **SQL injection** | All queries use parameterised statements — no string concatenation |
| **Password hashing** | bcrypt with 12 salt rounds |
| **JWT** | HS256, 7-day expiry, stored in localStorage (no cookies, no CSRF risk) |
| **Secret isolation** | API keys never sent to the frontend — all LLM calls are server-side only |
| **Account deletion** | `ON DELETE CASCADE` on all user data tables — deletion is atomic |
| **Error handling** | Stack traces never returned in API responses |
| **Scraping limits** | 10-second timeout, maximum 3 redirects per request |

*Built by [Cerqueira Loïc](https://github.com/Loic2888)*
