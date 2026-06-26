/**
 * server/utils/logger.js
 *
 * Minimal structured logger that writes newline-delimited JSON to stdout.
 * Each log entry includes a severity level, an ISO 8601 timestamp, a human-
 * readable message, and any additional key-value data supplied by the caller.
 * Outputting JSON makes logs easy to ingest into external log aggregation
 * platforms (Render, Datadog, etc.) without extra parsing.
 */

/**
 * Serializes a log entry to JSON and writes it to stdout. level is the
 * severity string ("info", "warn", or "error"). message is the primary
 * human-readable description of the event. data is an optional object of
 * supplementary fields that are merged into the log entry at the top level.
 */
function log(level, message, data = {}) {
  const entry = { level, time: new Date().toISOString(), message, ...data }
  console.log(JSON.stringify(entry))
}

/**
 * Public logger interface exposing three severity levels. Each method accepts
 * a message string and an optional plain object of contextual data fields.
 * All output is written to stdout as structured JSON via the internal log
 * function.
 */
export const logger = {
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data)
}
