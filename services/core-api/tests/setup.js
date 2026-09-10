// =============================================================
// Test Setup
// =============================================================
// Sets up a test database, runs migrations, and provides
// helper functions for authentication in tests.
//
// ISOLATION STRATEGY:
// - Each test file gets a clean database (migrations run once,
//   tables truncated between test suites)
// - Tests use a separate 'koyla_chain_test' database
// - Knex pool is destroyed after all tests
// =============================================================

const db = require('../src/config/database');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

// Test user constants (matching seed data UUIDs)
const TEST_USERS = {
  miner: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    role: 'ROLE_MINER',
    mine_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    subsidiary_id: '11111111-1111-1111-1111-111111111111',
    email: 'miner@koyla.dev',
  },
  overman: {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    role: 'ROLE_OVERMAN',
    mine_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    subsidiary_id: '11111111-1111-1111-1111-111111111111',
    email: 'overman@koyla.dev',
  },
  manager: {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    role: 'ROLE_MINE_MANAGER',
    mine_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    subsidiary_id: '11111111-1111-1111-1111-111111111111',
    email: 'manager@koyla.dev',
  },
  dgms: {
    id: '99999999-9999-9999-9999-999999999999',
    role: 'ROLE_DGMS_INSPECTOR',
    mine_id: null,
    subsidiary_id: null,
    email: 'inspector@dgms.gov.in',
  },
  // Miner from a DIFFERENT mine (for tenant isolation tests)
  otherMiner: {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddd22',
    role: 'ROLE_MINER',
    mine_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    subsidiary_id: '22222222-2222-2222-2222-222222222222',
    email: 'miner2@koyla.dev',
  },
};

const TEST_MINES = {
  rajmahal: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  dhanbad: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
};

const TEST_INCIDENTS = {
  incident1: '10000000-0000-0000-0000-000000000001',
  incident3_dhanbad: '10000000-0000-0000-0000-000000000003',
};

const TEST_SENSORS = {
  ventShaft: '30000000-0000-0000-0000-000000000001',
};

/**
 * Generate a valid JWT for a test user.
 */
function generateTestToken(userKey) {
  const user = TEST_USERS[userKey];
  if (!user) throw new Error(`Unknown test user: ${userKey}`);

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      mine_id: user.mine_id,
      subsidiary_id: user.subsidiary_id,
      jti: `test-jti-${userKey}-${Date.now()}`,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

/**
 * Get Authorization header for a test user.
 */
function authHeader(userKey) {
  return `Bearer ${generateTestToken(userKey)}`;
}

// ── Global test lifecycle ───────────────────────
// Run migrations once before all tests
beforeAll(async () => {
  try {
    await db.migrate.latest();
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  }
});

// Destroy connection pool after all tests
afterAll(async () => {
  await db.destroy();
});

module.exports = {
  app,
  db,
  TEST_USERS,
  TEST_MINES,
  TEST_INCIDENTS,
  TEST_SENSORS,
  generateTestToken,
  authHeader,
};
