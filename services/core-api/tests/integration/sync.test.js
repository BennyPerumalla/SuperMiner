// =============================================================
// Integration Tests: WatermelonDB Sync Engine
// =============================================================
// This is the MOST IMPORTANT test file.
//
// Tests cover:
// 1. Basic pull — returns changes since timestamp
// 2. Basic push — creates, updates, deletes
// 3. IDEMPOTENT RETRIES — duplicate push creates no duplicates
// 4. SERVER-WINS — server version beats stale client edit
// 5. OFFLINE SCENARIO — full offline→online cycle
// 6. Soft deletes — deleted IDs appear in pull response
// 7. Tenant isolation — sync respects mine_id scoping
// =============================================================

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const { app, db, authHeader, TEST_USERS } = require('../setup');

describe('WatermelonDB Sync Engine', () => {
  beforeAll(async () => {
    await db.seed.run();
  });

  // ════════════════════════════════════════════════
  // PULL TESTS
  // ════════════════════════════════════════════════
  describe('GET /api/sync (Pull)', () => {
    it('should return all records on first sync (lastPulledAt=0)', async () => {
      const res = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('miner'));

      expect(res.status).toBe(200);
      expect(res.body.data.changes).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
      expect(res.body.data.timestamp).toBeGreaterThan(0);

      // Should have incidents from miner's mine
      expect(res.body.data.changes.incidents.created.length).toBeGreaterThan(0);
    });

    it('should return only changes since lastPulledAt', async () => {
      // First, get the current timestamp
      const firstPull = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('miner'));

      const timestamp = firstPull.body.data.timestamp;

      // Second pull with the timestamp — should return no new records
      // (nothing changed between pulls)
      const secondPull = await request(app)
        .get(`/api/sync?last_pulled_at=${timestamp}`)
        .set('Authorization', authHeader('miner'));

      expect(secondPull.status).toBe(200);
      expect(secondPull.body.data.changes.incidents.created.length).toBe(0);
      expect(secondPull.body.data.changes.incidents.updated.length).toBe(0);
      expect(secondPull.body.data.changes.incidents.deleted.length).toBe(0);
    });

    it('should include deleted record IDs in pull response', async () => {
      // Create a record, then soft-delete it
      const incidentId = uuidv4();
      await db('incidents').insert({
        id: incidentId,
        mine_id: TEST_USERS.miner.mine_id,
        reported_by: TEST_USERS.miner.id,
        type: 'other',
        severity: 'low',
        status: 'reported',
        description: 'Test incident for delete sync test',
        occurred_at: new Date(),
      });

      const beforeDelete = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('miner'));
      const tsBeforeDelete = beforeDelete.body.data.timestamp;

      // Soft delete
      await db('incidents').where('id', incidentId).update({
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      // Pull after delete — should include the ID in deleted array
      const afterDelete = await request(app)
        .get(`/api/sync?last_pulled_at=${tsBeforeDelete}`)
        .set('Authorization', authHeader('miner'));

      expect(afterDelete.body.data.changes.incidents.deleted).toContain(incidentId);
    });

    it('should respect tenant scoping — miner sees only their mine', async () => {
      const res = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('miner'));

      // All returned incidents should be from miner's mine
      const incidents = res.body.data.changes.incidents.created;
      incidents.forEach((incident) => {
        expect(incident.mine_id).toBe(TEST_USERS.miner.mine_id);
      });
    });

    it('DGMS inspector sees incidents from all mines', async () => {
      const res = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('dgms'));

      const incidents = res.body.data.changes.incidents.created;
      const mineIds = [...new Set(incidents.map((i) => i.mine_id))];
      expect(mineIds.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ════════════════════════════════════════════════
  // PUSH TESTS
  // ════════════════════════════════════════════════
  describe('POST /api/sync (Push)', () => {
    it('should create records with mobile-generated UUIDs', async () => {
      const mobileId = uuidv4();

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send({
          changes: {
            incidents: {
              created: [{
                id: mobileId,
                type: 'ppe_violation',
                severity: 'medium',
                status: 'reported',
                description: 'Mobile-created incident via sync push',
                occurred_at: new Date().toISOString(),
              }],
              updated: [],
              deleted: [],
            },
          },
          lastPulledAt: 0,
        });

      expect(res.status).toBe(200);

      // Verify record exists in database
      const record = await db('incidents').where('id', mobileId).first();
      expect(record).toBeDefined();
      expect(record.mine_id).toBe(TEST_USERS.miner.mine_id);
      expect(record.reported_by).toBe(TEST_USERS.miner.id);

      // Cleanup
      await db('incidents').where('id', mobileId).del();
    });

    it('should soft-delete records', async () => {
      // Create a record to delete
      const incidentId = uuidv4();
      await db('incidents').insert({
        id: incidentId,
        mine_id: TEST_USERS.miner.mine_id,
        reported_by: TEST_USERS.miner.id,
        type: 'other',
        severity: 'low',
        status: 'reported',
        description: 'Will be deleted via sync',
        occurred_at: new Date(),
      });

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send({
          changes: {
            incidents: {
              created: [],
              updated: [],
              deleted: [incidentId],
            },
          },
          lastPulledAt: 0,
        });

      expect(res.status).toBe(200);

      // Verify soft delete (record exists but has deleted_at)
      const record = await db('incidents').where('id', incidentId).first();
      expect(record).toBeDefined();
      expect(record.deleted_at).not.toBeNull();

      // Cleanup
      await db('incidents').where('id', incidentId).del();
    });
  });

  // ════════════════════════════════════════════════
  // IDEMPOTENCY TESTS (THE CRITICAL FAILURE SCENARIO)
  // ════════════════════════════════════════════════
  describe('Idempotent Retries', () => {
    it('duplicate push creates NO duplicate records', async () => {
      // SCENARIO:
      // 1. Mobile creates 3 incidents offline
      // 2. Mobile pushes → server processes → mobile loses connection
      // 3. Mobile never gets 200 OK
      // 4. Mobile retries THE EXACT SAME push
      // 5. Server receives duplicate → NO duplicate records

      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();

      const pushPayload = {
        changes: {
          incidents: {
            created: [
              {
                id: id1,
                type: 'safety_violation',
                severity: 'high',
                status: 'reported',
                description: 'Idempotency test incident 1',
                occurred_at: new Date().toISOString(),
              },
              {
                id: id2,
                type: 'gas_leak',
                severity: 'critical',
                status: 'reported',
                description: 'Idempotency test incident 2',
                occurred_at: new Date().toISOString(),
              },
              {
                id: id3,
                type: 'ppe_violation',
                severity: 'low',
                status: 'reported',
                description: 'Idempotency test incident 3',
                occurred_at: new Date().toISOString(),
              },
            ],
            updated: [],
            deleted: [],
          },
        },
        lastPulledAt: 0,
      };

      // First push — should succeed
      const res1 = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send(pushPayload);
      expect(res1.status).toBe(200);

      // RETRY — exact same push (simulating connection drop)
      const res2 = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send(pushPayload);
      expect(res2.status).toBe(200);

      // VERIFY: Only 1 record per ID (no duplicates!)
      const count1 = await db('incidents').where('id', id1).count('* as cnt');
      const count2 = await db('incidents').where('id', id2).count('* as cnt');
      const count3 = await db('incidents').where('id', id3).count('* as cnt');

      expect(parseInt(count1[0].cnt)).toBe(1);
      expect(parseInt(count2[0].cnt)).toBe(1);
      expect(parseInt(count3[0].cnt)).toBe(1);

      // Cleanup
      await db('incidents').whereIn('id', [id1, id2, id3]).del();
    });

    it('duplicate soft-delete is idempotent', async () => {
      const incidentId = uuidv4();
      await db('incidents').insert({
        id: incidentId,
        mine_id: TEST_USERS.miner.mine_id,
        reported_by: TEST_USERS.miner.id,
        type: 'other',
        severity: 'low',
        status: 'reported',
        description: 'Double-delete test',
        occurred_at: new Date(),
      });

      const deletePayload = {
        changes: {
          incidents: { created: [], updated: [], deleted: [incidentId] },
        },
        lastPulledAt: 0,
      };

      // Delete once
      await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send(deletePayload);

      // Delete again (retry) — should not error
      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send(deletePayload);

      expect(res.status).toBe(200);

      // Cleanup
      await db('incidents').where('id', incidentId).del();
    });
  });

  // ════════════════════════════════════════════════
  // SERVER-WINS CONFLICT RESOLUTION
  // ════════════════════════════════════════════════
  describe('Server-Wins Conflict Resolution', () => {
    it('server version beats stale client edit', async () => {
      // SCENARIO:
      // T=0: Client pulls. Gets incident with severity='medium'.
      // T=1: Manager updates incident severity to 'critical' on server.
      // T=2: Client (offline) changes severity to 'low'.
      // T=3: Client pushes with lastPulledAt from T=0.
      // EXPECTED: Server keeps 'critical' (server-wins).

      const incidentId = uuidv4();
      await db('incidents').insert({
        id: incidentId,
        mine_id: TEST_USERS.miner.mine_id,
        reported_by: TEST_USERS.miner.id,
        type: 'safety_violation',
        severity: 'medium',
        status: 'reported',
        description: 'Conflict resolution test incident',
        occurred_at: new Date(),
      });

      // T=0: Client pulls
      const pullRes = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('miner'));
      const clientTimestamp = pullRes.body.data.timestamp;

      // T=1: Server-side update (manager changes severity)
      await db('incidents')
        .where('id', incidentId)
        .update({ severity: 'critical', updated_at: db.fn.now() });

      // T=2-3: Client pushes stale edit with old timestamp
      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('miner'))
        .send({
          changes: {
            incidents: {
              created: [],
              updated: [{
                id: incidentId,
                severity: 'low', // Client's stale edit
              }],
              deleted: [],
            },
          },
          lastPulledAt: clientTimestamp, // From T=0, before server update
        });

      expect(res.status).toBe(200);

      // Verify: Server's version wins
      const record = await db('incidents').where('id', incidentId).first();
      expect(record.severity).toBe('critical'); // NOT 'low'

      // Cleanup
      await db('incidents').where('id', incidentId).del();
    });
  });

  // ════════════════════════════════════════════════
  // FULL OFFLINE SCENARIO (from the brief)
  // ════════════════════════════════════════════════
  describe('Full Offline→Online Cycle', () => {
    it('handles complete offline session with retry', async () => {
      // T=0: Mobile syncs
      const initialPull = await request(app)
        .get('/api/sync?last_pulled_at=0')
        .set('Authorization', authHeader('overman'));
      const lastPulledAt = initialPull.body.data.timestamp;
      expect(initialPull.status).toBe(200);

      // T=1-4: Mobile goes offline, creates incidents, updates inspection
      const offlineId1 = uuidv4();
      const offlineId2 = uuidv4();
      const offlineId3 = uuidv4();

      const pushPayload = {
        changes: {
          incidents: {
            created: [
              {
                id: offlineId1,
                type: 'safety_violation',
                severity: 'high',
                status: 'reported',
                description: 'Offline incident 1 — workers without PPE in Zone C',
                occurred_at: new Date().toISOString(),
              },
              {
                id: offlineId2,
                type: 'gas_leak',
                severity: 'critical',
                status: 'reported',
                description: 'Offline incident 2 — methane spike detected manually',
                occurred_at: new Date().toISOString(),
              },
              {
                id: offlineId3,
                type: 'equipment_failure',
                severity: 'medium',
                status: 'reported',
                description: 'Offline incident 3 — conveyor belt malfunction',
                occurred_at: new Date().toISOString(),
              },
            ],
            updated: [],
            deleted: [],
          },
        },
        lastPulledAt,
      };

      // T=5: Mobile surfaces, pushes (this succeeds on server)
      const push1 = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('overman'))
        .send(pushPayload);
      expect(push1.status).toBe(200);

      // T=6: Connection drops, mobile never gets 200 OK
      // T=7: Mobile RETRIES the exact same push
      const push2 = await request(app)
        .post('/api/sync')
        .set('Authorization', authHeader('overman'))
        .send(pushPayload);
      expect(push2.status).toBe(200);

      // T=8: Mobile receives 200, marks changes as synced
      // T=9: Mobile pulls to get any changes from other users

      const finalPull = await request(app)
        .get(`/api/sync?last_pulled_at=${lastPulledAt}`)
        .set('Authorization', authHeader('overman'));
      expect(finalPull.status).toBe(200);

      // Verify: All 3 incidents exist, exactly once each
      for (const id of [offlineId1, offlineId2, offlineId3]) {
        const count = await db('incidents').where('id', id).count('* as cnt');
        expect(parseInt(count[0].cnt)).toBe(1);
      }

      // Verify: The incidents should appear as 'created' in the pull
      // (since they were created after lastPulledAt)
      const createdIds = finalPull.body.data.changes.incidents.created.map(i => i.id);
      expect(createdIds).toContain(offlineId1);
      expect(createdIds).toContain(offlineId2);
      expect(createdIds).toContain(offlineId3);

      // Cleanup
      await db('incidents').whereIn('id', [offlineId1, offlineId2, offlineId3]).del();
    });
  });
});
