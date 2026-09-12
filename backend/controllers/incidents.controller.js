const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET /api/incidents — list incidents (scoped)
exports.getAll = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'ROLE_DGMS_INSPECTOR') {
      // DGMS: global read access
      result = await db.query(
        `SELECT id, watermelon_id, mine_id, reported_by, description, severity, status,
                ST_AsGeoJSON(location) as location_geojson,
                reported_at, updated_at
         FROM incidents WHERE deleted_at IS NULL ORDER BY reported_at DESC`
      );
    } else if (req.user.mine_id) {
      // Others: only their mine
      result = await db.query(
        `SELECT id, watermelon_id, mine_id, reported_by, description, severity, status,
                ST_AsGeoJSON(location) as location_geojson,
                reported_at, updated_at
         FROM incidents WHERE mine_id = $1 AND deleted_at IS NULL ORDER BY reported_at DESC`,
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

// GET /api/incidents/:id — get incident details
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, watermelon_id, mine_id, reported_by, description, severity, status,
              ST_AsGeoJSON(location) as location_geojson,
              reported_at, updated_at
       FROM incidents WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const incident = result.rows[0];

    // Scope check: non-DGMS must belong to the same mine
    if (req.user.role !== 'ROLE_DGMS_INSPECTOR' && req.user.mine_id !== incident.mine_id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json(incident);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/incidents — create incident
exports.create = async (req, res) => {
  const { description, severity, mine_id, longitude, latitude } = req.body;
  try {
    // Use user's mine_id if not provided
    const targetMineId = mine_id || req.user.mine_id;
    if (!targetMineId) {
      return res.status(400).json({ error: 'mine_id is required' });
    }

    // Miners/Overmen can only create for their own mine
    if (req.user.mine_id && req.user.mine_id !== targetMineId) {
      return res.status(403).json({ error: 'Access denied. Not your mine.' });
    }

    const watermelonId = uuidv4(); // Server-generated UUID for API-created incidents
    let locationSql = 'NULL';
    const params = [watermelonId, targetMineId, req.user.id, description, severity || 'low'];

    if (longitude && latitude) {
      params.push(longitude, latitude);
      locationSql = `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)`;
    }

    const result = await db.query(
      `INSERT INTO incidents (watermelon_id, mine_id, reported_by, description, severity, location)
       VALUES ($1, $2, $3, $4, $5, ${locationSql})
       RETURNING id, watermelon_id, mine_id, reported_by, description, severity, status, reported_at`,
      params
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/incidents/:id — update incident
exports.update = async (req, res) => {
  const { description, severity, status } = req.body;
  try {
    // First check if incident exists and get its mine_id
    const existing = await db.query(
      'SELECT mine_id FROM incidents WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Scope check: manager can only update incidents from their mine
    if (req.user.mine_id && req.user.mine_id !== existing.rows[0].mine_id) {
      return res.status(403).json({ error: 'Access denied. Not your mine.' });
    }

    const result = await db.query(
      `UPDATE incidents SET description = COALESCE($1, description),
                            severity = COALESCE($2, severity),
                            status = COALESCE($3, status),
                            updated_at = NOW()
       WHERE id = $4 AND deleted_at IS NULL
       RETURNING id, watermelon_id, mine_id, description, severity, status, updated_at`,
      [description, severity, status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
