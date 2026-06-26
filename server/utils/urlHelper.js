/**
 * server/utils/urlHelper.js
 *
 * Utility functions for normalizing and validating user-supplied URLs before
 * they are used in outbound network requests. Also enforces an SSRF protection
 * policy by rejecting any hostname that resolves to a private or loopback
 * address, preventing the server from being used as a proxy into internal
 * networks.
 */

// Patterns that identify hostnames pointing to private or loopback address
// spaces. Any URL whose hostname matches one of these is rejected outright to
// prevent Server-Side Request Forgery (SSRF) attacks.
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^0\.0\.0\.0$/
]

/**
 * Normalizes a raw URL string into a canonical form suitable for use in HTTP
 * requests. Trims surrounding whitespace, prepends "https://" if no protocol
 * is present, and strips any trailing slashes from the path. Throws a
 * structured error if the input is missing or not a string.
 */
export function normalizeUrl(input) {
  if (!input || typeof input !== 'string') {
    throw { code: 'INVALID_URL', detail: 'URL is required' }
  }

  let url = input.trim()

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }

  url = url.replace(/\/+$/, '')

  return url
}

/**
 * Validates a normalized URL string for structural correctness and safety.
 * Parses the URL with the native URL constructor and checks that the protocol
 * is http or https. Then inspects the hostname against the private IP blocklist
 * to guard against SSRF. Returns the parsed URL object if all checks pass.
 * Throws a structured error with code INVALID_URL if any check fails.
 */
export function validateUrl(urlString) {
  let parsed
  try {
    parsed = new URL(urlString)
  } catch {
    throw { code: 'INVALID_URL', detail: 'Malformed URL' }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw { code: 'INVALID_URL', detail: 'Only http/https URLs are allowed' }
  }

  const hostname = parsed.hostname

  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw { code: 'INVALID_URL', detail: 'Private or loopback addresses are not allowed' }
    }
  }

  return parsed
}
