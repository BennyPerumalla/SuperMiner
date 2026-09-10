// =============================================================
// Request ID Middleware
// =============================================================
// Attaches a unique correlation ID to every request.
//
// WHY:
// When a mobile client reports "my sync failed," we need to trace
// that specific request through logs, database queries, and
// downstream service calls. Without a correlation ID, finding one
// request in a sea of logs is nearly impossible.
//
// HOW:
// - If the client sends X-Request-ID (e.g., from the mobile app),
//   we reuse it. This lets us correlate client-side and server-side
//   logs for the same operation.
// - If no header is present, we generate a UUID v4.
// - The ID is attached to the request object and included in the
//   response header so the client can reference it in bug reports.
// =============================================================

const { v4: uuidv4 } = require('uuid');

function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || uuidv4();
  req.id = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
