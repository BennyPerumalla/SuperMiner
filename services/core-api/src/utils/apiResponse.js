// =============================================================
// Standardized API Response Helpers
// =============================================================
// Every API response follows the same envelope format:
//
// Success: { success: true, data: {...}, meta: {...} }
// Error:   { success: false, error: { code: '...', message: '...', details: ... } }
//
// WHY AN ENVELOPE:
// Mobile clients need a consistent way to determine success/failure.
// HTTP status codes alone are insufficient because:
//   - Some proxy/CDN layers swallow status codes
//   - The `success` boolean is a reliable programmatic check
//   - The `meta` object carries pagination, timestamps, etc.
//
// ALTERNATIVE: HAL/JSON:API (overly complex for this use case).
// =============================================================

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {*} data - Response payload
 * @param {number} statusCode - HTTP status (default 200)
 * @param {object} meta - Optional metadata (pagination, timestamps)
 */
function success(res, data, statusCode = 200, meta = undefined) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Send a created response (201).
 */
function created(res, data) {
  return success(res, data, 201);
}

/**
 * Send a no-content response (204).
 */
function noContent(res) {
  return res.status(204).send();
}

/**
 * Send an error response.
 * Typically called by the global error handler, not directly by controllers.
 */
function error(res, statusCode, code, message, details = undefined) {
  const body = {
    success: false,
    error: { code, message },
  };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, created, noContent, error };
