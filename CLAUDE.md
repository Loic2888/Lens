# CLAUDE.md — Konsole Web Analyzer

## Project overview

Single-page web application that takes a company website URL as input and returns structured, actionable intelligence about that company: identity, tech stack, GTM signals, and an automatic B2B SaaS fit score.

Built for Youno's Konsole platform as a Revenue Engineering module.

**Stack**
- Frontend : React + Vite → deployed on **Vercel**
- Backend : Node.js + Express → deployed on **Render**
- LLM : Anthropic Claude API (`claude-sonnet-4-6`) for analysis and scoring
- HTML parsing : Cheerio
- No Docker — direct Node.js process on Render

---

## Repository layout

```
konsole-analyzer/
├── CLAUDE.md                    ← this file
├── .env.example
├── README.md
├── client/                      ← React frontend (Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── UrlForm.jsx      ← URL input + submit
│       │   ├── ResultCard.jsx   ← full analysis display
│       │   ├── ScoreGauge.jsx   ← visual fit score
│       │   └── Loader.jsx       ← loading state
│       └── styles/
│           └── index.css
└── server/                      ← Express backend
    ├── package.json
    ├── index.js                 ← Express entry point
    ├── routes/
    │   └── analyze.js           ← POST /api/analyze
    ├── services/
    │   ├── scraper.js           ← HTTP fetch + Cheerio extraction
    │   ├── analyzer.js          ← Claude API call + prompt
    │   └── scorer.js            ← B2B SaaS fit scoring logic
    └── utils/
        ├── urlHelper.js         ← URL normalization and validation
        └── logger.js            ← structured console logs
```

---

## Environment variables

### server/.env (never commit)
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-app.vercel.app
```

### client/.env (never commit)
```
VITE_API_URL=http://localhost:3001
```

### server/.env.example and client/.env.example
Provide both `.env.example` files with all keys and empty values. Never hardcode secrets.

---

## Backend — Express server

### Entry point `server/index.js`

```js
import express from 'express'
import cors from 'cors'
import { analyzeRouter } from './routes/analyze.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}))
app.use(express.json())
app.use('/api', analyzeRouter)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
```

### API contract

#### `POST /api/analyze`

**Request body**
```json
{
  "url": "stripe.com"
}
```

**Success response `200`**
```json
{
  "company": {
    "name": "Stripe",
    "domain": "stripe.com",
    "description": "Global payments infrastructure for the internet.",
    "sector": "Fintech / Payments",
    "business_model": "B2B SaaS",
    "estimated_size": "Enterprise (1000+ employees)",
    "founded_signal": "2010",
    "hq_signal": "San Francisco, CA"
  },
  "tech_stack": {
    "frontend": ["React", "Next.js"],
    "analytics": ["Segment", "Google Analytics"],
    "marketing": ["HubSpot"],
    "infrastructure": ["AWS", "Cloudflare"],
    "detected_via": "meta tags, script sources, HTTP headers"
  },
  "gtm_signals": {
    "has_pricing_page": true,
    "has_careers_page": true,
    "open_roles_signal": "Engineering, Sales, Marketing",
    "blog_active": true,
    "product_led": true,
    "free_trial_or_freemium": false,
    "demo_cta": true,
    "multilingual": true,
    "integrations_page": true
  },
  "score": {
    "value": 82,
    "label": "Strong fit",
    "rationale": "Large B2B SaaS with active GTM motion, developer-led product, and rich integration ecosystem. Likely buying sales/marketing tooling at scale.",
    "signals_positive": ["B2B model", "product-led growth", "integrations page", "active blog"],
    "signals_negative": ["Enterprise size may mean long sales cycles"]
  },
  "meta": {
    "scraped_at": "2026-06-25T10:00:00Z",
    "scrape_method": "direct_fetch",
    "analysis_model": "claude-sonnet-4-6"
  }
}
```

**Error response `400`**
```json
{ "error": "Invalid or unreachable URL" }
```

**Error response `500`**
```json
{ "error": "Analysis failed", "detail": "..." }
```

---

## Service layer

### `services/scraper.js`

Responsibility : fetch the target website and extract raw signals.

**Steps :**
1. Normalize the URL with `urlHelper.js` (add `https://` if missing, strip trailing slash)
2. HTTP GET with `axios` — timeout 10s, User-Agent set to `Mozilla/5.0` (avoid bot blocks)
3. Parse HTML with Cheerio
4. Extract and return a `RawSignals` object :

```js
{
  title: String,               // <title>
  metaDescription: String,     // <meta name="description">
  metaKeywords: String,        // <meta name="keywords">
  ogTitle: String,             // <meta property="og:title">
  ogDescription: String,       // <meta property="og:description">
  h1s: String[],               // all <h1> text content
  h2s: String[],               // first 10 <h2>
  navLinks: String[],          // all <a> text in <nav>
  scriptSrcs: String[],        // all <script src="...">
  linkHrefs: String[],         // all <link href="...">
  internalLinks: String[],     // href paths (for page detection)
  lang: String,                // <html lang="">
  canonicalUrl: String         // <link rel="canonical">
}
```

If fetch fails (timeout, CORS-equivalent, 4xx/5xx) : throw a structured error with `{ code: 'SCRAPE_FAILED', detail: message }`.

### `services/analyzer.js`

Responsibility : call Claude API with the raw signals and return structured JSON.

**Prompt strategy :**
- System prompt : defines the analyst role, the expected JSON schema, and strict instructions to return ONLY valid JSON with no markdown fences or preamble.
- User prompt : injects the serialized `RawSignals` object.
- Parse the response : `JSON.parse(data.content[0].text)` — wrap in try/catch, throw `ANALYSIS_FAILED` if JSON is invalid.

**Model :** always use `claude-sonnet-4-6`. Never make this configurable at runtime.

**Fields Claude must return :**
```
company.name, company.description, company.sector, company.business_model,
company.estimated_size, company.founded_signal, company.hq_signal,
tech_stack (frontend, analytics, marketing, infrastructure, detected_via),
gtm_signals (has_pricing_page, has_careers_page, open_roles_signal,
  blog_active, product_led, free_trial_or_freemium, demo_cta,
  multilingual, integrations_page)
```

Claude must infer what it can from the raw signals — it must never hallucinate confident facts not supported by any signal. If a field cannot be determined, use `null`.

### `services/scorer.js`

Responsibility : compute a B2B SaaS fit score (0–100) from the Claude analysis output.

**Scoring logic — deterministic, not LLM-based :**

| Signal | Points |
|--------|--------|
| business_model contains "B2B" | +20 |
| product_led = true | +15 |
| has_pricing_page = true | +10 |
| integrations_page = true | +10 |
| blog_active = true | +8 |
| demo_cta = true | +8 |
| has_careers_page = true | +5 |
| free_trial_or_freemium = true | +8 |
| multilingual = true | +5 |
| estimated_size is "SMB" or "Mid-market" | +5 (enterprise = 0) |
| sector contains "SaaS", "Software", "Tech" | +6 |

**Score labels :**
- 0–30 : Weak fit
- 31–55 : Moderate fit
- 56–75 : Good fit
- 76–100 : Strong fit

The `rationale` string is generated by Claude in the analysis step, not by the scorer. The scorer only computes `value`, `label`, `signals_positive`, and `signals_negative`.

---

## Frontend — React + Vite

### Component responsibilities

**`UrlForm.jsx`**
- Single text input for the URL
- Submit button → calls `POST /api/analyze`
- Input validation : not empty, rough URL format check (no need for regex overkill)
- Emits loading state to parent while request is in flight

**`ResultCard.jsx`**
- Receives the full API response object as prop
- Renders four sections : Company Identity, Tech Stack, GTM Signals, Fit Score
- GTM signals displayed as a tag/badge grid (true = colored, false = grey)
- Tech stack displayed as pill badges grouped by category

**`ScoreGauge.jsx`**
- Receives `score.value` (0–100) and `score.label`
- Visual gauge or large number display with color coding :
  - 0–30 : red
  - 31–55 : orange
  - 56–75 : blue
  - 76–100 : green
- Below the score : `score.rationale` text
- Below that : two columns `signals_positive` (✅) and `signals_negative` (⚠️)

**`Loader.jsx`**
- Displayed while the API call is in progress
- Show a message like "Analyzing stripe.com…" using the URL the user submitted

### API call

All API calls go through a single `client/src/api.js` file :

```js
export async function analyzeUrl(url) {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json()
}
```

---

## Deployment

### Backend → Render (Web Service)

- Build command : `npm install`
- Start command : `node index.js`
- Environment : Node 20
- All `.env` variables set in Render dashboard
- Free tier : service sleeps after 15 min inactivity — acceptable for demo

### Frontend → Vercel

- Framework preset : Vite
- Build command : `npm run build`
- Output directory : `dist`
- `VITE_API_URL` set to the Render backend URL in Vercel environment variables

### CORS

`ALLOWED_ORIGINS` in server `.env` must include the final Vercel URL once known. During development, include `http://localhost:5173`.

---

## Security rules

- Never log the raw `ANTHROPIC_API_KEY` value
- Never expose the API key to the frontend — all Claude calls happen server-side only
- Validate and sanitize the `url` input on the server before using it in any fetch call
- Reject URLs pointing to private IP ranges (127.x, 192.168.x, 10.x, localhost) to prevent SSRF
- Set a hard timeout of 10s on all outbound scraping requests
- Do not follow redirects more than 3 times

---

## Error handling rules

- All service functions throw structured errors : `{ code: String, detail: String }`
- The route handler catches all errors and maps them to appropriate HTTP status codes
- Never return a stack trace in the API response in production
- Log full error details server-side with `logger.js`

---

## Code style

- ES Modules throughout (`import`/`export`), not CommonJS
- All async functions use `async/await`, no raw `.then()` chains
- No business logic in `routes/` — routes only validate input and delegate to services
- No LLM calls outside of `services/analyzer.js`
- Keep each service file under 150 lines — split if it grows beyond that

---

## Implementation order for Claude Code

Follow this order strictly. Do not jump ahead.

1. Scaffold `server/` : `package.json`, `index.js`, `routes/analyze.js` (stub returning `{ ok: true }`)
2. Implement `utils/urlHelper.js` (normalize, validate, reject private IPs)
3. Implement `services/scraper.js` (fetch + Cheerio extraction → `RawSignals`)
4. Implement `services/analyzer.js` (Claude API call with full prompt + JSON parse)
5. Implement `services/scorer.js` (deterministic scoring from analysis output)
6. Wire all services into `routes/analyze.js` — full pipeline working end-to-end
7. Test the route manually with `curl` or a REST client before touching the frontend
8. Scaffold `client/` : Vite + React, basic `App.jsx` layout
9. Implement `client/src/api.js`
10. Implement `UrlForm.jsx`
11. Implement `Loader.jsx`
12. Implement `ScoreGauge.jsx`
13. Implement `ResultCard.jsx`
14. Wire all components in `App.jsx` with state management
15. Write both `.env.example` files
16. Write `README.md` with local setup instructions and deployment steps

---

## Out of scope (MVP)

- Authentication
- Result caching or database storage
- Batch URL analysis
- PDF/CSV export
- Historical comparisons
- Any Wappalyzer or third-party enrichment API integration
