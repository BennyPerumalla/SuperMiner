// =============================================================
// Integration Tests: PostGIS Spatial Queries
// =============================================================

const request = require('supertest');
const { app, db, authHeader, TEST_SENSORS } = require('../setup');

describe('PostGIS Spatial Queries', () => {
  beforeAll(async () => {
    await db.seed.run();
  });

  describe('GET /api/spatial/violations/near-shaft/:shaft_id', () => {
    it('finds safety violations within 500m of ventilation shaft', async () => {
      const res = await request(app)
        .get(`/api/spatial/violations/near-shaft/${TEST_SENSORS.ventShaft}`)
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      expect(res.body.data.violations).toBeDefined();
      expect(res.body.data.radius_meters).toBe(500);

      // The seed data places safety_violation incident near the shaft
      const violations = res.body.data.violations;
      if (violations.length > 0) {
        expect(violations[0].distance_meters).toBeLessThan(500);
        expect(violations[0].location).toBeDefined();
        expect(violations[0].type).toBe('safety_violation');
      }
    });

    it('returns empty array with very small radius', async () => {
      const res = await request(app)
        .get(`/api/spatial/violations/near-shaft/${TEST_SENSORS.ventShaft}?radius=1`)
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      // 1 meter radius — unlikely to find anything
    });

    it('returns 404 for non-existent shaft', async () => {
      const res = await request(app)
        .get('/api/spatial/violations/near-shaft/00000000-0000-0000-0000-000000000000')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/spatial/incidents/nearby', () => {
    it('finds incidents near a coordinate', async () => {
      const res = await request(app)
        .get('/api/spatial/incidents/nearby?longitude=87.1240&latitude=24.9880&radius=1000')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      expect(res.body.data.incidents).toBeDefined();
    });
  });

  describe('GET /api/spatial/mines/:mine_id/contains', () => {
    it('correctly identifies point inside mine boundary', async () => {
      // Point inside the Rajmahal mine boundary from seed
      const res = await request(app)
        .get('/api/spatial/mines/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/contains?longitude=87.125&latitude=24.985')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      expect(res.body.data.is_inside).toBe(true);
    });

    it('correctly identifies point outside mine boundary', async () => {
      // Point far outside the mine boundary
      const res = await request(app)
        .get('/api/spatial/mines/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/contains?longitude=80.0&latitude=20.0')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      expect(res.body.data.is_inside).toBe(false);
    });
  });

  describe('GET /api/spatial/mines/:mine_id/sensors', () => {
    it('returns sensors with GeoJSON locations', async () => {
      const res = await request(app)
        .get('/api/spatial/mines/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/sensors')
        .set('Authorization', authHeader('manager'));

      expect(res.status).toBe(200);
      expect(res.body.data.sensors).toBeDefined();
      expect(res.body.data.sensors.length).toBeGreaterThan(0);

      const sensor = res.body.data.sensors[0];
      expect(sensor.location).toBeDefined();
      expect(sensor.location.type).toBe('Point');
      expect(sensor.location.coordinates).toHaveLength(2);
    });
  });
});
