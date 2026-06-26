/**
 * server/services/scraper.js
 *
 * Fetches a target website and extracts raw signals from its HTML. Uses Axios
 * for the HTTP request (10 s timeout, max 3 redirects, browser-like User-Agent
 * to reduce bot-blocking) and Cheerio for DOM traversal. The returned
 * RawSignals object contains only observable facts from the page — no
 * interpretation or scoring takes place here.
 */
import axios from 'axios'
import * as cheerio from 'cheerio'
import { normalizeUrl, validateUrl } from '../utils/urlHelper.js'
import { logger } from '../utils/logger.js'

/**
 * Fetches the given URL and parses the response HTML into a RawSignals object.
 * Normalizes and validates the URL before making any network request. Throws a
 * structured error with code SCRAPE_FAILED if the request times out, returns a
 * 4xx/5xx status, or encounters a network-level failure.
 */
export async function scrape(rawUrl) {
  const normalized = normalizeUrl(rawUrl)
  validateUrl(normalized)

  let response
  try {
    response = await axios.get(normalized, {
      timeout: 10000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      validateStatus: (status) => status < 500
    })
  } catch (err) {
    logger.error('Scrape failed', { url: normalized, detail: err.message })
    throw { code: 'SCRAPE_FAILED', detail: err.message }
  }

  if (response.status >= 400) {
    throw { code: 'SCRAPE_FAILED', detail: `HTTP ${response.status}` }
  }

  const $ = cheerio.load(response.data)

  const navLinks = []
  $('nav a').each((_, el) => {
    const text = $(el).text().trim()
    if (text) navLinks.push(text)
  })

  const scriptSrcs = []
  $('script[src]').each((_, el) => {
    scriptSrcs.push($(el).attr('src'))
  })

  const linkHrefs = []
  $('link[href]').each((_, el) => {
    linkHrefs.push($(el).attr('href'))
  })

  const internalLinks = []
  const parsedBase = new URL(normalized)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && (href.startsWith('/') || href.includes(parsedBase.hostname))) {
      internalLinks.push(href)
    }
  })

  const h1s = []
  $('h1').each((_, el) => h1s.push($(el).text().trim()))

  const h2s = []
  $('h2').each((_, el) => {
    if (h2s.length < 10) h2s.push($(el).text().trim())
  })

  return {
    title: $('title').text().trim() || null,
    metaDescription: $('meta[name="description"]').attr('content') || null,
    metaKeywords: $('meta[name="keywords"]').attr('content') || null,
    ogTitle: $('meta[property="og:title"]').attr('content') || null,
    ogDescription: $('meta[property="og:description"]').attr('content') || null,
    h1s,
    h2s,
    navLinks,
    scriptSrcs,
    linkHrefs,
    internalLinks,
    lang: $('html').attr('lang') || null,
    canonicalUrl: $('link[rel="canonical"]').attr('href') || null
  }
}
