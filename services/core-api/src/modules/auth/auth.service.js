// =============================================================
// Auth Service
// =============================================================
// Business logic for authentication. Controllers call this
// service; the service talks to the database and Redis.
//
// JWT STRUCTURE:
// Access token: { sub, role, mine_id, subsidiary_id, jti, iat, exp }
// - sub: User UUID
// - role: RBAC role string
// - mine_id, subsidiary_id: Tenant scope (null for DGMS)
// - jti: JWT ID (UUID) for blacklisting on logout
// - iat: Issued at (Unix timestamp)
// - exp: Expiry (15 minutes for access, 7 days for refresh)
//
// WHY TWO TOKENS:
// - Access token (15min): Short-lived, used for API calls.
//   If stolen, limited damage window.
// - Refresh token (7d): Long-lived, used only to get a new
//   access token. Stored in Redis with a TTL. Can be revoked.
//
// WHY NOT A SINGLE LONG-LIVED TOKEN:
// If a JWT is stolen and has no expiry (or a long one), the
// attacker has indefinite access. Short access tokens + refresh
// tokens limit the blast radius of token theft.
// =============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/database');
const config = require('../../config');
const { getRedisClient } = require('../../config/redis');
const {
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../../utils/errors');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 10;

class AuthService {
  /**
   * Register a new user.
   * Only callable by ROLE_MINE_MANAGER (for their mine) or system setup.
   */
  async register(userData) {
    const { email, password, full_name, role, mine_id, subsidiary_id, employee_id } = userData;

    // Check for existing user with same email
    const existing = await db('users')
      .where('email', email)
      .whereNull('deleted_at')
      .first();

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    // Validate role-specific requirements
    if (role !== 'ROLE_DGMS_INSPECTOR' && !mine_id) {
      throw new BadRequestError('mine_id is required for non-DGMS roles');
    }
    if (role !== 'ROLE_DGMS_INSPECTOR' && !subsidiary_id) {
      throw new BadRequestError('subsidiary_id is required for non-DGMS roles');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await db('users')
      .insert({
        email,
        password_hash,
        full_name,
        role,
        mine_id: role === 'ROLE_DGMS_INSPECTOR' ? null : mine_id,
        subsidiary_id: role === 'ROLE_DGMS_INSPECTOR' ? null : subsidiary_id,
        employee_id,
      })
      .returning(['id', 'email', 'full_name', 'role', 'mine_id', 'subsidiary_id', 'created_at']);

    return user;
  }

  /**
   * Authenticate user and return tokens.
   */
  async login(email, password) {
    // Find user by email
    const user = await db('users')
      .where('email', email)
      .whereNull('deleted_at')
      .where('is_active', true)
      .first();

    if (!user) {
      // Use generic message to prevent email enumeration
      throw new UnauthorizedError('Invalid email or password');
    }

    // Compare password with stored hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = this._generateTokens(user);

    // Store refresh token in Redis
    await this._storeRefreshToken(tokens.refreshToken, user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        mine_id: user.mine_id,
        subsidiary_id: user.subsidiary_id,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refresh(refreshToken) {
    // Verify refresh token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if refresh token exists in Redis (not revoked)
    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        const stored = await redis.get(`rt:${decoded.jti}`);
        if (!stored) {
          throw new UnauthorizedError('Refresh token has been revoked');
        }
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      logger.warn({ err: err.message }, 'Redis unavailable for refresh token check');
    }

    // Fetch current user data (role/mine might have changed)
    const user = await db('users')
      .where('id', decoded.sub)
      .whereNull('deleted_at')
      .where('is_active', true)
      .first();

    if (!user) {
      throw new UnauthorizedError('User no longer exists or is inactive');
    }

    // Generate new tokens
    const tokens = this._generateTokens(user);

    // Revoke old refresh token and store new one
    await this._revokeRefreshToken(decoded.jti);
    await this._storeRefreshToken(tokens.refreshToken, user.id);

    return tokens;
  }

  /**
   * Logout — blacklist the access token and revoke the refresh token.
   */
  async logout(user, refreshToken) {
    try {
      const redis = getRedisClient();
      if (redis.status !== 'ready') {
        logger.warn('Redis unavailable — logout will not blacklist token');
        return;
      }

      // Blacklist the access token's JTI
      // TTL = remaining lifetime of the access token
      if (user.jti) {
        await redis.setex(`bl:${user.jti}`, 900, '1'); // 15 minutes max
      }

      // Revoke refresh token if provided
      if (refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
          await this._revokeRefreshToken(decoded.jti);
        } catch (err) {
          // Refresh token might already be expired — that's fine
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error during logout');
    }
  }

  /**
   * Generate access and refresh tokens for a user.
   */
  _generateTokens(user) {
    const jti = uuidv4();
    const refreshJti = uuidv4();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        mine_id: user.mine_id,
        subsidiary_id: user.subsidiary_id,
        jti,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiresIn }
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: refreshJti,
        type: 'refresh',
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Store refresh token in Redis with TTL.
   */
  async _storeRefreshToken(refreshToken, userId) {
    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        const decoded = jwt.decode(refreshToken);
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        await redis.setex(`rt:${decoded.jti}`, ttl, userId);
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to store refresh token in Redis');
    }
  }

  /**
   * Revoke a refresh token by deleting it from Redis.
   */
  async _revokeRefreshToken(jti) {
    try {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        await redis.del(`rt:${jti}`);
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Failed to revoke refresh token');
    }
  }
}

module.exports = new AuthService();
