// =============================================================
// Structured Logger (Pino)
// =============================================================
// WHY PINO OVER WINSTON:
// - 5x faster (benchmark-proven) — Pino uses JSON serialization
//   directly, while Winston has a complex transport pipeline.
// - Structured JSON output by default — critical for log aggregation
//   (ELK, Datadog, CloudWatch). Winston needs plugins for this.
// - Lower memory footprint — important when running in containers.
//
// In development: pino-pretty formats logs for human readability.
// In production: raw JSON for machine parsing.
// =============================================================

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.nodeEnv === 'test' ? 'silent' : 'info',
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
  // In production, raw JSON goes to stdout.
  // A log collector (Fluentd, Filebeat) picks it up from there.
});

module.exports = logger;
