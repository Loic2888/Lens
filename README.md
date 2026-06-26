# Konsole Web Analyzer

Single-page web application that takes a company website URL and returns structured B2B intelligence: company identity, tech stack, GTM signals, and a fit score.

## Stack

- **Frontend**: React + Vite → Vercel
- **Backend**: Node.js + Express → Render
- **LLM**: Anthropic Claude API (`claude-sonnet-4-6`)

## Local setup

### Prerequisites

- Node.js 20+
- An Anthropic API key

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
npm install
npm start
# Server runs on http://localhost:3001
```

### 2. Frontend

```bash
cd client
cp .env.example .env
# VITE_API_URL is already set to http://localhost:3001
npm install
npm run dev
# App runs on http://localhost:5173
```

## Testing the API

```bash
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "stripe.com"}'
```

## Deployment

### Backend → Render

1. Create a new **Web Service** on Render
2. Connect your repository, set root to `server/`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Runtime: **Node 20**
6. Add environment variables in Render dashboard:
   - `ANTHROPIC_API_KEY`
   - `ALLOWED_ORIGINS` (include your Vercel URL once known)

### Frontend → Vercel

1. Import the repository on Vercel
2. Set root directory to `client/`
3. Framework preset: **Vite**
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add environment variable:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://konsole-api.onrender.com`)

### CORS

Once you have the Vercel URL, add it to `ALLOWED_ORIGINS` in the Render environment settings.

## Security notes

- The Anthropic API key is never exposed to the frontend
- Private/loopback IP addresses are rejected (SSRF protection)
- Scraping requests time out after 10 seconds and follow at most 3 redirects
- Stack traces are never returned in production API responses
