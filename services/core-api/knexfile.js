// =============================================================
// Knex Configuration
// =============================================================
// Knex is a SQL query builder (NOT a full ORM like Sequelize/TypeORM).
//
// WHY KNEX OVER AN ORM:
// 1. PostGIS: ORMs poorly support spatial functions like ST_DWithin,
//    ST_AsGeoJSON, geography casts. Knex lets us write these naturally.
// 2. Sync engine: The WatermelonDB push requires precise INSERT ON
//    CONFLICT DO NOTHING and conditional UPDATEs. ORMs abstract this away.
// 3. Migrations: Knex has a robust migration system with up/down.
// 4. Transparency: We can see the exact SQL being generated.
//
// WHY NOT RAW SQL:
// - We'd lose migration management and seed tooling.
// - Parameterized queries are error-prone to write by hand.
// - Knex gives us just enough abstraction without hiding the SQL.
// =============================================================

require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'koyla',
      password: process.env.DB_PASSWORD || 'koyla_dev',
      database: process.env.DB_NAME || 'koyla_chain',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },

  test: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'koyla',
      password: process.env.DB_PASSWORD || 'koyla_dev',
      database: process.env.DB_NAME_TEST || 'koyla_chain_test',
    },
    pool: { min: 2, max: 5 },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations',
    },
  },
};
