// =============================================================
// Integration Tests: Authentication
// =============================================================

const request = require('supertest');
const { app, db, authHeader } = require('../setup');

describe('Auth API', () => {
  // Seed the database before auth tests
  beforeAll(async () => {
    await db.seed.run();
  });

  describe('POST /api/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'miner@koyla.dev', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe('miner@koyla.dev');
      expect(res.body.data.user.role).toBe('ROLE_MINER');
      // Password hash must NEVER be in the response
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'miner@koyla.dev', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      // Generic message to prevent email enumeration
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@koyla.dev', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should return 422 for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'miner@koyla.dev' }); // missing password

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', authHeader('miner'));

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('miner@koyla.dev');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(401);
    });
  });
});
