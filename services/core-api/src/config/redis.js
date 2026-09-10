// =============================================================
// Redis Client (ioredis)
// =============================================================
// Used for:
//   1. Refresh token storage (SETEX with TTL = refresh token lifetime)
//   2. JWT blacklist on logout (SETEX with TTL = remaining access token lifetime)
//   3. Rate limiting on sync endpoints (sliding window counter)
//
// WHY IOREDIS OVER NODE-REDIS:
// - Built-in reconnection with exponential backoff
// - Cluster support (if we ever need it)
// - Lua scripting support (useful for atomic rate limiting)
// - Better TypeScript types
//
// RESILIENCE:
// Redis is NOT on the critical path. If Redis is unreachable:
// - JWT verification still works (JWTs are self-contained)
// - CRUD operations still work (PostgreSQL is the source of truth)
// - Only rate limiting and token blacklisting degrade gracefully
// =============================================================

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redis = null;

/**
 * Get or create the Redis client singleton.
 * Lazy initialization so tests can skip Redis entirely.
 */
function getRedisClient() {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 50ms, 100ms, 200ms, ... up to 2 seconds
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  return redis;
}

module.exports = { getRedisClient };
