// =============================================================
// Server Entry Point
// =============================================================
// Starts the HTTP server after running database migrations.
// Migrations run on startup in development to ensure the
// schema is always up-to-date. In production, migrations
// should be run as a separate step before deployment.
// =============================================================

const app = require('./app');
const config = require('./config');
const db = require('./config/database');
const { getRedisClient } = require('./config/redis');
const logger = require('./utils/logger');

async function start() {
  try {
    // ── Verify database connection ────────────────
    await db.raw('SELECT 1');
    logger.info('PostgreSQL connected');

    // ── Run migrations in development ─────────────
    if (config.nodeEnv !== 'production') {
      logger.info('Running database migrations...');
      await db.migrate.latest();
      logger.info('Migrations completed');
    }

    // ── Connect Redis (non-blocking) ──────────────
    try {
      const redis = getRedisClient();
      await redis.connect();
      logger.info('Redis connected');
    } catch (err) {
      // Redis is optional — log and continue
      logger.warn({ err: err.message }, 'Redis connection failed — continuing without Redis');
    }

    // ── Start HTTP server ─────────────────────────
    const server = app.listen(config.port, () => {
      logger.info(`Core API running on port ${config.port}`);
      logger.info(`Swagger UI: http://localhost:${config.port}/api-docs`);
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // ── Graceful shutdown ─────────────────────────
    // On SIGTERM (Docker stop) or SIGINT (Ctrl+C):
    // 1. Stop accepting new connections
    // 2. Close database pool (finish in-flight queries)
    // 3. Close Redis connection
    // 4. Exit
    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await db.destroy();
          logger.info('Database connections closed');
        } catch (err) {
          logger.error({ err }, 'Error closing database');
        }

        try {
          const redis = getRedisClient();
          await redis.quit();
          logger.info('Redis connection closed');
        } catch (err) {
          // Redis might not be connected
        }

        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Graceful shutdown timed out. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ── Unhandled rejections ──────────────────────
    process.on('unhandledRejection', (reason) => {
      logger.error({ err: reason }, 'Unhandled promise rejection');
      // Don't crash — log and continue
    });

  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
