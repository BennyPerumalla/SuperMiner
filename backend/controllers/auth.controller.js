const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

// Valid roles for this application
const VALID_ROLES = ['ROLE_MINER', 'ROLE_OVERMAN', 'ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR'];

exports.register = async (req, res) => {
  const { name, email, password, role, mine_id, subsidiary_id } = req.body;
  try {
    // Validate role if provided
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (name, email, password_hash, role, mine_id, subsidiary_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, mine_id, subsidiary_id`,
      [name, email, passwordHash, role || 'ROLE_MINER', mine_id || null, subsidiary_id || null]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Include mine_id and subsidiary_id in JWT for scope-based authorization
    const token = jwt.sign(
      { id: user.id, role: user.role, mine_id: user.mine_id, subsidiary_id: user.subsidiary_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mine_id: user.mine_id,
        subsidiary_id: user.subsidiary_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/auth/me — returns current user info from JWT
exports.me = async (req, res) => {
  try {
    const userRes = await db.query(
      'SELECT id, name, email, role, mine_id, subsidiary_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
