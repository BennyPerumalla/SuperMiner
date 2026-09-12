const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const minesRoutes = require('./routes/mines.routes');
const incidentsRoutes = require('./routes/incidents.routes');
const inspectionsRoutes = require('./routes/inspections.routes');
const syncRoutes = require('./routes/sync.routes');
const spatialRoutes = require('./routes/spatial.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mines', minesRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/inspections', inspectionsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/spatial', spatialRoutes);

// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
