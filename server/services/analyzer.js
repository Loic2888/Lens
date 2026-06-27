import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger.js'

const SYSTEM_PROMPT = `You are a B2B intelligence analyst. Given raw HTML signals from a company website, return a structured JSON object describing the company.

Return ONLY valid JSON — no markdown fences, no preamble, no trailing text.

The JSON must follow this exact schema:
{
  "company": {
    "name": string | null,
    "description": string | null,
    "sector": string | null,
    "business_model": string | null,
    "estimated_size": string | null,
    "founded_signal": string | null,
    "hq_signal": string | null
  },
  "tech_stack": {
    "frontend": string[],
    "analytics": string[],
    "marketing": string[],
    "infrastructure": string[],
    "detected_via": string
  },
  "gtm_signals": {
    "has_pricing_page": boolean,
    "has_careers_page": boolean,
    "open_roles_signal": string | null,
    "blog_active": boolean,
    "product_led": boolean,
    "free_trial_or_freemium": boolean,
    "demo_cta": boolean,
    "multilingual": boolean,
    "integrations_page": boolean
  },
  "score": {
    "rationale": string
  }
}

Rules:
- ALL text fields (description, sector, business_model, estimated_size, founded_signal, hq_signal, open_roles_signal, detected_via, rationale) must be written in FRENCH only. Never mix languages.
- Proper nouns (company names, city names, product names, technology names) stay in their original form — do not translate them.
- Infer only from the provided signals. Never hallucinate confident facts not supported by any signal.
- Use null for any field that cannot be determined from the signals.
- For estimated_size, use one of: "TPE/PME (1-50 employés)", "Mid-market (50-500 employés)", "Grande entreprise (500-1000 employés)", "Très grande entreprise (1000+ employés)".
- For business_model, indicate if B2B, B2C, or mixed, written in French (e.g. "B2B SaaS", "B2C", "Mixte B2B/B2C").
- The rationale must explain the B2B SaaS fit in 1-2 sentences in French based on the signals.`

// Detect provider at startup — Claude takes priority over Gemini
const PROVIDER = process.env.ANTHROPIC_API_KEY ? 'anthropic'
               : process.env.GEMINI_API_KEY     ? 'gemini'
               : null

if (PROVIDER) {
  logger.info(`LLM provider: ${PROVIDER === 'anthropic' ? 'Claude (claude-sonnet-4-6)' : 'Gemini (gemini-2.5-flash)'}`)
} else {
  logger.error('No LLM API key found — set ANTHROPIC_API_KEY or GEMINI_API_KEY')
}

// Returns the active model name for the meta field in API responses
export function getActiveModel() {
  if (PROVIDER === 'anthropic') return 'claude-sonnet-4-6'
  if (PROVIDER === 'gemini')    return 'gemini-2.5-flash'
  return 'none'
}

// --- Anthropic (Claude) ---

const anthropic = PROVIDER === 'anthropic'
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

async function analyzeWithClaude(userMessage) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
      return response.content[0].text
    } catch (err) {
      const msg = err.message || ''
      const retryable = err.status === 529 || msg.includes('529') || msg.includes('overloaded')
      if (retryable && attempt < 3) {
        const delay = 1000 * 2 ** (attempt - 1)
        logger.info(`Claude overloaded — retrying in ${delay}ms (attempt ${attempt}/3)`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      logger.error('Claude API call failed', { detail: msg })
      throw { code: 'ANALYSIS_FAILED', detail: msg }
    }
  }
}

// --- Google (Gemini) ---

const genAI = PROVIDER === 'gemini'
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

async function analyzeWithGemini(userMessage) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { temperature: 0 }
  })

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(userMessage)
      return result.response.text()
    } catch (err) {
      const msg = err.message || ''
      const retryable = msg.includes('503') || msg.includes('529') || msg.includes('overloaded') || msg.includes('high demand')
      if (retryable && attempt < 3) {
        const delay = 1000 * 2 ** (attempt - 1)
        logger.info(`Gemini 503 — retrying in ${delay}ms (attempt ${attempt}/3)`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      logger.error('Gemini API call failed', { detail: msg })
      throw { code: 'ANALYSIS_FAILED', detail: msg }
    }
  }
}

// --- Public interface ---

export async function analyze(rawSignals, domain) {
  if (!PROVIDER) {
    throw { code: 'ANALYSIS_FAILED', detail: 'No LLM API key configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY.' }
  }

  const userMessage = `Analyze this company website (domain: ${domain}) based on these extracted signals:\n\n${JSON.stringify(rawSignals, null, 2)}`

  const rawText = PROVIDER === 'anthropic'
    ? await analyzeWithClaude(userMessage)
    : await analyzeWithGemini(userMessage)

  logger.info(`Analysis completed via ${PROVIDER}`)

  const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    logger.error('Failed to parse LLM response as JSON', { rawText })
    throw { code: 'ANALYSIS_FAILED', detail: 'LLM returned invalid JSON' }
  }

  return parsed
}
