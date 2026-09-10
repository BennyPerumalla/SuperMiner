// =============================================================
// Integration Tests: RBAC + Tenant Isolation
// =============================================================
// These tests verify that:
// 1. Roles can only access permitted resources
// 2. Users can only see data from their own mine
// 3. Cross-tenant access is denied at the query level
//
// This is one of the most important test files because
// security bugs here = data leaks between subsidiaries.
// =============================================================

const request = require('supertest');
const { app, db, authHeader, TEST_INCIDENTS } = require('../setup');

describe('RBAC + Tenant Isolation', () => {
  beforeAll(async () => {
    await db.seed.run();
  });

  // ── ROLE_MINER permissions ──────────────────────
  describe('ROLE_MINER', () => {
    it('can GET incidents from their own mine', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', authHeader('miner'));

      expect(res.status).toBe(200);
      expect(res.body.data.incidents).toBeDefined();
      // Should only see incidents from mine Rajmahal
      res.body.data.incidents.forEach((incident) => {
        expect(incident.mine_id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      });
    });

    it('can POST a new incident to their mine', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', authHeader('miner'))
        .send({
          type: 'ppe_violation',
          severity: 'medium',
          description: 'Test incident from miner integration test',
          occurred_at: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      // mine_id should be auto-set from JWT, not from body
      expect(res.body.data.incident.mine_id).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    });

    it('CANNOT update incidents', async () => {
      const res = await request(app)
        .put(`/api/incidents/${TEST_INCIDENTS.incident1}`)
        .set('Authorization', authHeader('miner'))
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
    });

    it('CANNOT access inspections create', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Authorization', authHeader('miner'))
        .send({ type: 'routine' });

      expect(res.status).toBe(403);
    });

    it('CANNOT access user management', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', authHeader('miner'));

      expect(res.status).toBe(403);
    });
  });

  // ── TENANT ISOLATION (the critical test) ────────
  describe('Tenant Isolation', () => {
    it('miner from Mine A CANNOT see incidents from Mine B', async () => {
      // miner is in Rajmahal (Mine A)
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', authHeader('miner'));

      expect(res.status).toBe(200);
      const incidents = res.body.data.incidents;
      // Incident 3 is in Dhanbad (Mine B) — should NOT appear
      const dhanbadIncident = incidents.find(
        (i) => i.id === TEST_INCIDENTS.incident3_dhanbad
      );
      expect(dhanbadIncident).toBeUndefined();
    });

    it('miner from Mine B CANNOT see incidents from Mine A', async () => {
      // otherMiner is in Dhanbad (Mine B)
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', authHeader('otherMiner'));

      expect(res.status).toBe(200);
      const incidents = res.body.data.incidents;
      // Incident 1 is in Rajmahal (Mine A) — should NOT appear
      const rajmahalIncident = incidents.find(
        (i) => i.id === TEST_INCIDENTS.incident1
      );
      expect(rajmahalIncident).toBeUndefined();
    });

    it('DGMS inspector CAN see incidents from ALL mines', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', authHeader('dgms'));

      expect(res.status).toBe(200);
      const incidents = res.body.data.incidents;
      const mineIds = [...new Set(incidents.map((i) => i.mine_id))];
      // Should see incidents from multiple mines
      expect(mineIds.length).toBeGreaterThanOrEqual(2);
    });

    it('DGMS inspector CANNOT push sync data', async () => {
      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('dgms'))
        .send({
          changes: { incidents: { created: [], updated: [], deleted: [] } },
          lastPulledAt: 0,
        });

      expect(res.status).toBe(403);
    });
  });

  // ── ROLE_MINE_MANAGER permissions ───────────────
  describe('ROLE_MINE_MANAGER', () => {
    it('can read incidents from their mine', async () => {
      const res = await request(app)
        .get('/api/incidents')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
    });

    it('can update incidents in their mine', async () => {
      const res = await request(app)
        .put(`/api/incidents/${TEST_INCIDENTS.incident1}`)
        .set('Authorization', authHeader('manager'))
        .send({ status: 'acknowledged' });

      expect(res.status).toBe(200);
    });

    it('CANNOT create incidents (not an operational role)', async () => {
      const res = await request(app)
        .post('/api/incidents')
        .set('Authorization', authHeader('manager'))
        .send({
          type: 'safety_violation',
          severity: 'low',
          description: 'Manager trying to create incident',
          occurred_at: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
    });
  });

  // ── ROLE_DGMS_INSPECTOR permissions ─────────────
  describe('ROLE_DGMS_INSPECTOR', () => {
    it('can read all mines (global access)', async () => {
      const res = await request(app)
        .get('/api/mines')
        .set('Authorization', authHeader('dgms'));

      expect(res.status).toBe(200);
    });

    it('can create compliance audit inspections', async () => {
      const res = await request(app)
        .post('/api/inspections')
        .set('Authorization', authHeader('dgms'))
        .send({
          type: 'compliance_audit',
          mine_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(res.status).toBe(201);
    });

    it('CANNOT modify operational data (incidents)', async () => {
      const res = await request(app)
        .put(`/api/incidents/${TEST_INCIDENTS.incident1}`)
        .set('Authorization', authHeader('dgms'))
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
    });
  });
});
