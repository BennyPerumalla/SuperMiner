// =============================================================
// Authentication Middleware (JWT Verification)
// =============================================================
// This is LEVEL 1 of our three-level authorization chain:
//   Level 1: authenticate.js  → Is this a valid, non-expired JWT?
//   Level 2: authorize.js     → Does this role have permission?
//   Level 3: authorize.js     → Does this user belong to this tenant?
//
// HOW JWT WORKS:
// 1. Client sends: Authorization: Bearer <token>
// 2. We decode the token using the shared secret (HMAC-SHA256).
// 3. If the signature is valid and the token isn't expired, we
//    extract the payload { sub, role, mine_id, subsidiary_id }
//    and attach it to req.user.
// 4. Subsequent middleware/controllers can access req.user
//    without another database lookup.
//
// WHY JWT OVER SESSIONS:
// - Stateless: No server-side session store needed for auth checks.
// - Offline-first: Mobile caches the JWT; no session cookie issues.
// - Reduced DB load: With 100s of sync requests/minute, avoiding
//   a session lookup on each saves significant DB queries.
//
// WHY WE STILL USE REDIS:
// JWT's statelessness is a double-edged sword. We can't invalidate
// a JWT before its expiry (e.g., on logout, password change).
// Redis stores a blacklist of invalidated JTIs (JWT IDs) with
// TTL = remaining token lifetime. This is checked here.
// =============================================================

const jwt = require('jsonwebtoken');
const config = require('../config');
const { UnauthorizedError } = require('../utils/errors');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

async function authenticate(req, res, next) {
  try {
    // ── Extract token ─────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    // ── Verify signature and expiry ───────────────
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw err;
    }

    // ── Check blacklist (if Redis is available) ───
    // Graceful degradation: if Redis is down, skip blacklist check.
    // This means recently-logged-out tokens may still work until
    // they expire. Acceptable tradeoff for availability.
    try {
      const redis = getRedisClient();
      if (redis.status === 'ready' && decoded.jti) {
        const isBlacklisted = await redis.get(`bl:${decoded.jti}`);
        if (isBlacklisted) {
          throw new UnauthorizedError('Token has been revoked');
        }
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      // Redis connection error — log and continue
      logger.warn({ err: err.message }, 'Redis unavailable for blacklist check');
    }

    // ── Attach user to request ────────────────────
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      mineId: decoded.mine_id || null,
      subsidiaryId: decoded.subsidiary_id || null,
      jti: decoded.jti,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authenticate;
