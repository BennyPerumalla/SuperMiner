// =============================================================
// Rate Limiter Middleware (Redis-based Sliding Window)
// =============================================================
// WHY RATE LIMITING:
// Mobile clients with intermittent connectivity retry aggressively.
// Without rate limiting, a retry storm from 100 devices can
// overwhelm the sync endpoint. Rate limiting protects the
// database from connection exhaustion.
//
// WHY REDIS-BASED (not in-memory):
// - In-memory counters are lost on process restart.
// - If we run multiple Node instances (horizontal scaling),
//   in-memory limits are per-process, not per-user.
// - Redis gives us a shared, persistent counter.
//
// ALGORITHM: Fixed Window Counter
// Simple but effective. We use a Redis key per user per window
// (e.g., "rl:user-id:1694000") and INCR it. TTL = window size.
//
// ALTERNATIVE: Token bucket (smoother, but more complex).
// Fixed window is sufficient for our use case.
//
// GRACEFUL DEGRADATION:
// If Redis is down, we skip rate limiting and let the request
// through. Availability over strict rate enforcement.
// =============================================================

const { getRedisClient } = require('../config/redis');
const config = require('../config');
const { TooManyRequestsError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Creates rate limiting middleware.
 * @param {object} options
 * @param {number} options.windowMs - Window size in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.prefix - Redis key prefix
 */
function rateLimiter(options = {}) {
  const {
    windowMs = config.rateLimit.syncWindowMs,
    max = config.rateLimit.syncMaxRequests,
    prefix = 'rl',
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    try {
      const redis = getRedisClient();
      if (redis.status !== 'ready') {
        // Redis unavailable — skip rate limiting
        return next();
      }

      const userId = req.user?.id || req.ip;
      const windowKey = Math.floor(Date.now() / windowMs);
      const key = `${prefix}:${userId}:${windowKey}`;

      const current = await redis.incr(key);

      // Set TTL on first request in this window
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      if (current > max) {
        throw new TooManyRequestsError(
          `Rate limit exceeded. Try again in ${windowSeconds} seconds.`
        );
      }

      next();
    } catch (err) {
      if (err instanceof TooManyRequestsError) {
        return next(err);
      }
      // Redis error — log and allow the request
      logger.warn({ err: err.message }, 'Rate limiter error, allowing request');
      next();
    }
  };
}

module.exports = rateLimiter;
