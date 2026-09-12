const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET /api/inspections — list inspections (scoped)
exports.getAll = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'ROLE_DGMS_INSPECTOR') {
      result = await db.query(
        `SELECT id, watermelon_id, mine_id, inspector_id, status, notes,
                inspection_date, updated_at
         FROM inspections WHERE deleted_at IS NULL ORDER BY inspection_date DESC`
      );
    } else if (req.user.mine_id) {
      result = await db.query(
        `SELECT id, watermelon_id, mine_id, inspector_id, status, notes,
                inspection_date, updated_at
         FROM inspections WHERE mine_id = $1 AND deleted_at IS NULL ORDER BY inspection_date DESC`,
        [req.user.mine_id]
      );
    } else {
      result = { rows: [] };
    }

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/inspections/:id — get inspection details
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, watermelon_id, mine_id, inspector_id, status, notes,
              inspection_date, updated_at
       FROM inspections WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    const inspection = result.rows[0];

    if (req.user.role !== 'ROLE_DGMS_INSPECTOR' && req.user.mine_id !== inspection.mine_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(inspection);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/inspections — create inspection
exports.create = async (req, res) => {
  const { mine_id, notes, status } = req.body;
  try {
    // DGMS can inspect any mine, others only their own
    const targetMineId = mine_id || req.user.mine_id;
    if (!targetMineId) {
      return res.status(400).json({ error: 'mine_id is required' });
    }

    if (req.user.role !== 'ROLE_DGMS_INSPECTOR' && req.user.mine_id !== targetMineId) {
      return res.status(403).json({ error: 'Access denied. Not your mine.' });
    }

    const watermelonId = uuidv4();

    const result = await db.query(
      `INSERT INTO inspections (watermelon_id, mine_id, inspector_id, status, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, watermelon_id, mine_id, inspector_id, status, notes, inspection_date`,
      [watermelonId, targetMineId, req.user.id, status || 'pending', notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/inspections/:id — update inspection
exports.update = async (req, res) => {
  const { status, notes } = req.body;
  try {
    const existing = await db.query(
      'SELECT mine_id FROM inspections WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Inspection not found' });
    }

    // Manager: own mine only. DGMS: any mine.
    if (req.user.role !== 'ROLE_DGMS_INSPECTOR' && req.user.mine_id !== existing.rows[0].mine_id) {
      return res.status(403).json({ error: 'Access denied. Not your mine.' });
    }

    const result = await db.query(
      `UPDATE inspections SET status = COALESCE($1, status),
                              notes = COALESCE($2, notes),
                              updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id, watermelon_id, mine_id, inspector_id, status, notes, updated_at`,
      [status, notes, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
