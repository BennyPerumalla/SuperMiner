// =============================================================
// Express Application Setup
// =============================================================
// Separated from index.js (entry point) so that:
// 1. Tests can import the app without starting the HTTP server.
// 2. The app is configured once, tested, then started.
//
// MIDDLEWARE ORDER MATTERS:
// 1. helmet     → Security headers (before any response)
// 2. cors       → CORS headers (before any response)
// 3. json       → Parse request body
// 4. requestId  → Attach correlation ID (before logging)
// 5. pinoHttp   → Log every request with correlation ID
// 6. routes     → Application routes (auth, CRUD, sync)
// 7. 404        → Catch unmatched routes
// 8. errorHandler → Catch all errors (MUST be last)
// =============================================================

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');

const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const { NotFoundError } = require('./utils/errors');
const logger = require('./utils/logger');
const swaggerSpec = require('./docs/swagger');

// ── Route imports ───────────────────────────────
const authRoutes = require('./modules/auth/auth.routes');
const minesRoutes = require('./modules/mines/mines.routes');
const incidentsRoutes = require('./modules/incidents/incidents.routes');
const inspectionsRoutes = require('./modules/inspections/inspections.routes');
const usersRoutes = require('./modules/users/users.routes');
const syncRoutes = require('./modules/sync/sync.routes');
const spatialRoutes = require('./modules/spatial/spatial.routes');

const app = express();

// ── Security headers ────────────────────────────
app.use(helmet());

// ── CORS ────────────────────────────────────────
// In development, allow all origins. In production, restrict to
// known mobile app origins and admin dashboard domains.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN?.split(',')
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// ── Body parsing ────────────────────────────────
// 10MB limit for sync payloads (can contain batched records)
app.use(express.json({ limit: '10mb' }));

// ── Request ID ──────────────────────────────────
app.use(requestId);

// ── Request logging ─────────────────────────────
app.use(pinoHttp({
  logger,
  customProps: (req) => ({ requestId: req.id }),
  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/api-docs',
  },
}));

// ── Health check (no auth required) ─────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Swagger UI ──────────────────────────────────
const swaggerUi = require('swagger-ui-express');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Koyla-Chain API Docs',
}));

// Serve raw OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Application routes ──────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/mines', minesRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/spatial', spatialRoutes);

// ── 404 handler ─────────────────────────────────
app.use((req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
});

// ── Global error handler (MUST be last) ─────────
app.use(errorHandler);

module.exports = app;
