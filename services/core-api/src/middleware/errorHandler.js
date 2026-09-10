// =============================================================
// Global Error Handler
// =============================================================
// Express error-handling middleware (4 arguments: err, req, res, next).
// This is the LAST middleware in the chain. It catches:
//
// 1. OPERATIONAL ERRORS (expected):
//    - Validation failures → 422
//    - Auth failures → 401/403
//    - Not found → 404
//    These are instances of AppError with isOperational = true.
//    We return a clean JSON error response.
//
// 2. PROGRAMMING ERRORS (bugs):
//    - TypeError, ReferenceError, etc.
//    - Database connection failures
//    - Unhandled promise rejections
//    These have isOperational = false.
//    We log the full stack trace and return a generic 500.
//    NEVER expose internal error details to the client.
//
// WHY THIS PATTERN:
// Without a global error handler, unhandled errors crash the
// Express process. With it, every error — thrown or passed via
// next(err) — is caught, logged, and returned as a structured
// JSON response. The mobile client always gets a parseable response.
// =============================================================

const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const apiResponse = require('../utils/apiResponse');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── Log the error ────────────────────────────────
  if (err instanceof AppError && err.isOperational) {
    // Expected error — log at warn level
    logger.warn(
      {
        requestId: req.id,
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
      },
      'Operational error'
    );
  } else {
    // Unexpected error — log at error level with full stack
    logger.error(
      {
        requestId: req.id,
        err,
        path: req.path,
        method: req.method,
        body: req.body,
      },
      'Unexpected error'
    );
  }

  // ── Send response ───────────────────────────────
  if (err instanceof AppError) {
    return apiResponse.error(
      res,
      err.statusCode,
      err.code,
      err.message,
      err.details
    );
  }

  // Unexpected errors — never leak internal details
  return apiResponse.error(
    res,
    500,
    'INTERNAL_ERROR',
    'An unexpected error occurred'
  );
}

module.exports = errorHandler;
