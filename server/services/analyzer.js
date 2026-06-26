/**
 * server/services/analyzer.js
 *
 * Sends the raw HTML signals produced by the scraper to Claude Sonnet 4.6 and
 * parses the structured JSON response. This is the only file in the codebase
 * that makes LLM calls. The system prompt enforces a strict output schema so
 * downstream code can access all expected fields without defensive checks.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger.js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

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
- Infer only from the provided signals. Never hallucinate confident facts not supported by any signal.
- Use null for any field that cannot be determined from the signals.
- For estimated_size, use one of: "SMB (1-50 employees)", "Mid-market (50-500 employees)", "Enterprise (500-1000 employees)", "Large Enterprise (1000+ employees)".
- For business_model, indicate if B2B, B2C, or mixed.
- The rationale must explain the B2B SaaS fit in 1-2 sentences based on the signals.`

export async function analyze(rawSignals, domain) {
  const userMessage = `Analyze this company website (domain: ${domain}) based on these extracted signals:\n\n${JSON.stringify(rawSignals, null, 2)}`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT
  })

  let result
  try {
    result = await model.generateContent(userMessage)
  } catch (err) {
    logger.error('Gemini API call failed', { detail: err.message })
    throw { code: 'ANALYSIS_FAILED', detail: err.message }
  }

  const text = result.response.text()

  // Strip markdown fences if Gemini wraps the JSON despite instructions
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    logger.error('Failed to parse Gemini response as JSON', { text })
    throw { code: 'ANALYSIS_FAILED', detail: 'Gemini returned invalid JSON' }
  }

  return parsed
}
