// =============================================================
// Database Connection (Knex Singleton)
// =============================================================
// Returns a Knex instance configured for the current environment.
// The instance is a singleton — the same connection pool is reused
// across all imports.
//
// WHY A SINGLETON:
// Each Knex instance manages a connection pool (min: 2, max: 10).
// Creating multiple instances would exhaust PostgreSQL connections.
// Node.js module caching ensures require() returns the same object.
// =============================================================

const knex = require('knex');
const knexConfig = require('../../knexfile');
const config = require('./index');

const environment = config.nodeEnv === 'test' ? 'test' : 'development';
const db = knex(knexConfig[environment] || knexConfig.development);

module.exports = db;
