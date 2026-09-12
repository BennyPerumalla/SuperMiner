const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/superminer'
});

const query = (text, params) => pool.query(text, params);

const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('Database schema initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = {
  pool,
  query,
  initDb
};
