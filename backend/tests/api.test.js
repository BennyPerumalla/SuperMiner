/**
 * SuperMiner API Integration Tests
 *
 * These tests run against a real PostgreSQL database.
 * Requirements:
 *   1. PostgreSQL with PostGIS running
 *   2. Database 'superminer_test' created
 *   3. Run: npm test
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/superminer_test node --test tests/api.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const BASE_URL = `http://localhost:${process.env.TEST_PORT || 3001}`;

// We'll start the app in the before() hook
let server;
let db;

// Tokens for different roles
let minerToken, overmanToken, managerToken, inspectorToken;
let testMineId, testIncidentId, testInspectionId;

before(async () => {
  // Use test database
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/superminer_test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.PORT = process.env.TEST_PORT || 3001;

  // Initialize database
  db = require('../db');
  await db.initDb();

  // Start server
  const app = require('../app');
  server = app.listen(process.env.PORT);

  // Seed: create a subsidiary and mine for testing
  await db.query('TRUNCATE ventilation_shafts, inspections, incidents, users, mines, subsidiaries RESTART IDENTITY CASCADE');
  await db.query("INSERT INTO subsidiaries (name) VALUES ('Test Subsidiary')");
  await db.query(
    `INSERT INTO mines (name, company_name, subsidiary_id, status, location)
     VALUES ('Test Mine', 'Test Co', 1, 'active', ST_SetSRID(ST_MakePoint(86.42, 23.74), 4326))`
  );
  await db.query(
    `INSERT INTO mines (name, company_name, subsidiary_id, status, location)
     VALUES ('Other Mine', 'Other Co', 1, 'active', ST_SetSRID(ST_MakePoint(87.13, 23.62), 4326))`
  );
  // Add a ventilation shaft for spatial tests
  await db.query(
    `INSERT INTO ventilation_shafts (mine_id, name, location)
     VALUES (1, 'Test Shaft A', ST_SetSRID(ST_MakePoint(86.418, 23.738), 4326))`
  );
});

after(async () => {
  if (server) server.close();
  if (db && db.pool) await db.pool.end();
});

// Helper to make API calls
async function api(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

// ==========================================
// AUTH TESTS
// ==========================================

describe('Auth', () => {
  it('should register a miner', async () => {
    const { status, data } = await api('POST', '/api/auth/register', {
      name: 'Test Miner', email: 'miner@test.com', password: 'password123',
      role: 'ROLE_MINER', mine_id: 1, subsidiary_id: 1
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.role, 'ROLE_MINER');
    assert.strictEqual(data.mine_id, 1);
  });

  it('should register an overman', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      name: 'Test Overman', email: 'overman@test.com', password: 'password123',
      role: 'ROLE_OVERMAN', mine_id: 1, subsidiary_id: 1
    });
    assert.strictEqual(status, 201);
  });

  it('should register a manager', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      name: 'Test Manager', email: 'manager@test.com', password: 'password123',
      role: 'ROLE_MINE_MANAGER', mine_id: 1, subsidiary_id: 1
    });
    assert.strictEqual(status, 201);
  });

  it('should register a DGMS inspector', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      name: 'Test Inspector', email: 'inspector@test.com', password: 'password123',
      role: 'ROLE_DGMS_INSPECTOR'
    });
    assert.strictEqual(status, 201);
  });

  it('should reject duplicate email', async () => {
    const { status, data } = await api('POST', '/api/auth/register', {
      name: 'Duplicate', email: 'miner@test.com', password: 'password123'
    });
    assert.strictEqual(status, 400);
    assert.ok(data.error);
  });

  it('should reject invalid role', async () => {
    const { status } = await api('POST', '/api/auth/register', {
      name: 'Bad Role', email: 'badrole@test.com', password: 'password123',
      role: 'ROLE_ADMIN'
    });
    assert.strictEqual(status, 400);
  });

  it('should login successfully', async () => {
    const { status, data } = await api('POST', '/api/auth/login', {
      email: 'miner@test.com', password: 'password123'
    });
    assert.strictEqual(status, 200);
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'ROLE_MINER');
    minerToken = data.token;
  });

  it('should login all roles', async () => {
    let res;
    res = await api('POST', '/api/auth/login', { email: 'overman@test.com', password: 'password123' });
    overmanToken = res.data.token;

    res = await api('POST', '/api/auth/login', { email: 'manager@test.com', password: 'password123' });
    managerToken = res.data.token;

    res = await api('POST', '/api/auth/login', { email: 'inspector@test.com', password: 'password123' });
    inspectorToken = res.data.token;

    assert.ok(overmanToken);
    assert.ok(managerToken);
    assert.ok(inspectorToken);
  });

  it('should reject wrong password', async () => {
    const { status } = await api('POST', '/api/auth/login', {
      email: 'miner@test.com', password: 'wrongpassword'
    });
    assert.strictEqual(status, 400);
  });

  it('should get current user with /me', async () => {
    const { status, data } = await api('GET', '/api/auth/me', null, minerToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.email, 'miner@test.com');
  });

  it('should reject /me without token', async () => {
    const { status } = await api('GET', '/api/auth/me');
    assert.strictEqual(status, 401);
  });
});

// ==========================================
// MINES TESTS
// ==========================================

describe('Mines', () => {
  it('should list mines for authenticated user', async () => {
    const { status, data } = await api('GET', '/api/mines', null, minerToken);
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data));
    // Miner is assigned to mine 1, should only see that mine
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].name, 'Test Mine');
  });

  it('should list ALL mines for DGMS inspector', async () => {
    const { status, data } = await api('GET', '/api/mines', null, inspectorToken);
    assert.strictEqual(status, 200);
    assert.ok(data.length >= 2); // Should see both mines
  });

  it('should create a mine (manager)', async () => {
    const { status, data } = await api('POST', '/api/mines', {
      name: 'New Mine', company_name: 'New Co', longitude: 85.5, latitude: 24.0
    }, managerToken);
    assert.strictEqual(status, 201);
    assert.strictEqual(data.name, 'New Mine');
    testMineId = data.id;
  });

  it('should reject mine creation by miner', async () => {
    const { status } = await api('POST', '/api/mines', {
      name: 'Forbidden Mine', company_name: 'No Co'
    }, minerToken);
    assert.strictEqual(status, 403);
  });

  it('should get mine by id', async () => {
    const { status, data } = await api('GET', '/api/mines/1', null, minerToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.name, 'Test Mine');
  });

  it('should deny miner access to another mine', async () => {
    const { status } = await api('GET', '/api/mines/2', null, minerToken);
    assert.strictEqual(status, 403);
  });
});

// ==========================================
// INCIDENTS TESTS
// ==========================================

describe('Incidents', () => {
  it('should create an incident (miner)', async () => {
    const { status, data } = await api('POST', '/api/incidents', {
      description: 'Gas leak detected in section 4',
      severity: 'high',
      longitude: 86.419,
      latitude: 23.739
    }, minerToken);
    assert.strictEqual(status, 201);
    assert.ok(data.watermelon_id);
    testIncidentId = data.id;
  });

  it('should list incidents scoped to mine', async () => {
    const { status, data } = await api('GET', '/api/incidents', null, minerToken);
    assert.strictEqual(status, 200);
    assert.ok(data.length >= 1);
    // All incidents should be from mine 1
    data.forEach(inc => assert.strictEqual(inc.mine_id, 1));
  });

  it('should reject incident creation by manager', async () => {
    const { status } = await api('POST', '/api/incidents', {
      description: 'Managers cannot create'
    }, managerToken);
    assert.strictEqual(status, 403);
  });

  it('should update incident (manager)', async () => {
    const { status, data } = await api('PUT', `/api/incidents/${testIncidentId}`, {
      status: 'investigating', severity: 'critical'
    }, managerToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'investigating');
  });

  it('should deny DGMS from updating incidents', async () => {
    const { status } = await api('PUT', `/api/incidents/${testIncidentId}`, {
      status: 'resolved'
    }, inspectorToken);
    assert.strictEqual(status, 403);
  });
});

// ==========================================
// INSPECTIONS TESTS
// ==========================================

describe('Inspections', () => {
  it('should create an inspection (DGMS)', async () => {
    const { status, data } = await api('POST', '/api/inspections', {
      mine_id: 1, notes: 'Quarterly safety inspection'
    }, inspectorToken);
    assert.strictEqual(status, 201);
    assert.ok(data.watermelon_id);
    testInspectionId = data.id;
  });

  it('should create an inspection (overman)', async () => {
    const { status } = await api('POST', '/api/inspections', {
      notes: 'Daily check'
    }, overmanToken);
    assert.strictEqual(status, 201);
  });

  it('should reject inspection creation by miner', async () => {
    const { status } = await api('POST', '/api/inspections', {
      notes: 'Not allowed'
    }, minerToken);
    assert.strictEqual(status, 403);
  });

  it('should update inspection (DGMS)', async () => {
    const { status, data } = await api('PUT', `/api/inspections/${testInspectionId}`, {
      status: 'completed', notes: 'All clear'
    }, inspectorToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'completed');
  });
});

// ==========================================
// SYNC TESTS (Critical!)
// ==========================================

describe('Sync', () => {
  it('should pull all records with last_pulled_at=0', async () => {
    const { status, data } = await api('GET', '/api/sync?last_pulled_at=0', null, minerToken);
    assert.strictEqual(status, 200);
    assert.ok(data.changes);
    assert.ok(data.changes.incidents);
    assert.ok(data.changes.inspections);
    assert.ok(data.timestamp);
    // Should have created records (everything is new)
    assert.ok(data.changes.incidents.created.length > 0);
  });

  it('should push new records from mobile', async () => {
    const { status, data } = await api('POST', '/api/sync', {
      changes: {
        incidents: {
          created: [{
            id: 'mobile-uuid-test-001',
            description: 'Mobile-reported gas leak',
            severity: 'high',
            mine_id: 1
          }],
          updated: [],
          deleted: []
        },
        inspections: { created: [], updated: [], deleted: [] }
      },
      lastPulledAt: Date.now()
    }, minerToken);
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
  });

  it('should handle DUPLICATE RETRY safely', async () => {
    // Push the SAME UUID again — should NOT create a duplicate
    const { status } = await api('POST', '/api/sync', {
      changes: {
        incidents: {
          created: [{
            id: 'mobile-uuid-test-001',   // Same UUID as above!
            description: 'Mobile-reported gas leak',
            severity: 'high',
            mine_id: 1
          }],
          updated: [],
          deleted: []
        },
        inspections: { created: [], updated: [], deleted: [] }
      },
      lastPulledAt: Date.now()
    }, minerToken);
    assert.strictEqual(status, 200);

    // Verify only ONE record with this watermelon_id exists
    const check = await db.query(
      "SELECT COUNT(*) FROM incidents WHERE watermelon_id = 'mobile-uuid-test-001'"
    );
    assert.strictEqual(parseInt(check.rows[0].count), 1, 'Duplicate should NOT be created');
  });

  it('should handle CONFLICT with server-wins', async () => {
    // First, update the record on the server directly
    await db.query(
      "UPDATE incidents SET description = 'Server updated', updated_at = NOW() WHERE watermelon_id = 'mobile-uuid-test-001'"
    );

    // Now push a mobile update with an OLD lastPulledAt
    const oldTimestamp = Date.now() - 60000; // 1 minute ago
    const { status } = await api('POST', '/api/sync', {
      changes: {
        incidents: {
          created: [],
          updated: [{
            id: 'mobile-uuid-test-001',
            description: 'Mobile override attempt',
            severity: 'low'
          }],
          deleted: []
        },
        inspections: { created: [], updated: [], deleted: [] }
      },
      lastPulledAt: oldTimestamp
    }, minerToken);
    assert.strictEqual(status, 200);

    // Server version should be preserved
    const check = await db.query(
      "SELECT description FROM incidents WHERE watermelon_id = 'mobile-uuid-test-001'"
    );
    assert.strictEqual(check.rows[0].description, 'Server updated', 'Server wins — mobile change should be rejected');
  });

  it('should sync deleted records', async () => {
    // Soft-delete a record
    await db.query(
      "UPDATE incidents SET deleted_at = NOW() WHERE watermelon_id = 'mobile-uuid-test-001'"
    );

    // Pull should include it in deleted
    const { status, data } = await api('GET', '/api/sync?last_pulled_at=0', null, minerToken);
    assert.strictEqual(status, 200);
    assert.ok(data.changes.incidents.deleted.includes('mobile-uuid-test-001'), 'Deleted UUID should appear in sync pull');
  });

  it('should handle delete from mobile via push', async () => {
    // Create a record to delete
    await db.query(
      "INSERT INTO incidents (watermelon_id, mine_id, reported_by, description) VALUES ('delete-me-uuid', 1, 1, 'Will be deleted')"
    );

    const { status } = await api('POST', '/api/sync', {
      changes: {
        incidents: {
          created: [],
          updated: [],
          deleted: ['delete-me-uuid']
        },
        inspections: { created: [], updated: [], deleted: [] }
      },
      lastPulledAt: Date.now()
    }, minerToken);
    assert.strictEqual(status, 200);

    // Verify soft-deleted
    const check = await db.query(
      "SELECT deleted_at FROM incidents WHERE watermelon_id = 'delete-me-uuid'"
    );
    assert.ok(check.rows[0].deleted_at, 'Record should be soft-deleted');
  });
});

// ==========================================
// SPATIAL TESTS
// ==========================================

describe('Spatial', () => {
  it('should find incidents near a point', async () => {
    // Create an incident with a known location
    await db.query(
      `INSERT INTO incidents (watermelon_id, mine_id, reported_by, description, severity, location)
       VALUES ('spatial-test-001', 1, 1, 'Near shaft', 'high', ST_SetSRID(ST_MakePoint(86.4185, 23.7385), 4326))`
    );

    const { status, data } = await api(
      'GET', '/api/spatial/incidents/nearby?lat=23.738&lng=86.418&radius=500',
      null, minerToken
    );
    assert.strictEqual(status, 200);
    assert.ok(data.count > 0, 'Should find nearby incidents');
    assert.ok(data.incidents[0].distance_meters, 'Should include distance');
  });

  it('should find violations near ventilation shaft', async () => {
    const { status, data } = await api(
      'GET', '/api/spatial/violations/near-shaft/1?radius=500',
      null, minerToken
    );
    assert.strictEqual(status, 200);
    assert.ok(data.shaft, 'Should include shaft info');
    assert.ok(data.count >= 0);
  });

  it('should return mine boundary as GeoJSON', async () => {
    // Add boundary to test mine
    await db.query(
      `UPDATE mines SET boundary = ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
        ST_MakePoint(86.415, 23.735),
        ST_MakePoint(86.425, 23.735),
        ST_MakePoint(86.425, 23.745),
        ST_MakePoint(86.415, 23.745),
        ST_MakePoint(86.415, 23.735)
       ])), 4326) WHERE id = 1`
    );

    const { status, data } = await api('GET', '/api/spatial/mines/1/boundary', null, minerToken);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.type, 'Feature');
    assert.ok(data.geometry, 'Should have geometry');
  });

  it('should return 404 for non-existent shaft', async () => {
    const { status } = await api('GET', '/api/spatial/violations/near-shaft/999', null, minerToken);
    assert.strictEqual(status, 404);
  });
});
