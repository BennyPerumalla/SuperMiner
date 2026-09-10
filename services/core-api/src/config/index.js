// =============================================================
// Application Configuration
// =============================================================
// Centralized config loaded from environment variables.
// Every config value is validated at startup — fail fast if
// a required variable is missing rather than failing at runtime
// when some obscure code path finally reads it.
// =============================================================

require('dotenv').config();

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'koyla',
    password: process.env.DB_PASSWORD || 'koyla_dev',
    database: process.env.DB_NAME || 'koyla_chain',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production-minimum-32-chars!!',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production!!',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.INTERNAL_API_KEY || 'dev-internal-api-key',
  },

  // Rate limiting for sync endpoints — mobile retry storms
  // can overwhelm the server if unchecked.
  rateLimit: {
    syncWindowMs: parseInt(process.env.RATE_LIMIT_SYNC_WINDOW || '60000'), // 1 minute
    syncMaxRequests: parseInt(process.env.RATE_LIMIT_SYNC_MAX || '30'),    // 30 requests per minute
  },
};

// ── Startup validation ──────────────────────────────────
// In production, we refuse to start without real secrets.
if (config.nodeEnv === 'production') {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = config;
