const db = require('../db');

// GET /api/mines — list mines (scoped by user's role)
exports.getAll = async (req, res) => {
  try {
    let result;

    if (req.user.role === 'ROLE_DGMS_INSPECTOR') {
      // DGMS inspector sees all mines
      result = await db.query(
        `SELECT id, name, company_name, subsidiary_id, status,
                ST_AsGeoJSON(location) as location_geojson,
                created_at, updated_at
         FROM mines WHERE deleted_at IS NULL ORDER BY name`
      );
    } else if (req.user.mine_id) {
      // Users assigned to a specific mine see only their mine
      result = await db.query(
        `SELECT id, name, company_name, subsidiary_id, status,
                ST_AsGeoJSON(location) as location_geojson,
                created_at, updated_at
         FROM mines WHERE id = $1 AND deleted_at IS NULL`,
        [req.user.mine_id]
      );
    } else if (req.user.subsidiary_id) {
      // Users with subsidiary see mines in their subsidiary
      result = await db.query(
        `SELECT id, name, company_name, subsidiary_id, status,
                ST_AsGeoJSON(location) as location_geojson,
                created_at, updated_at
         FROM mines WHERE subsidiary_id = $1 AND deleted_at IS NULL ORDER BY name`,
        [req.user.subsidiary_id]
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

// GET /api/mines/:id — get mine details
exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, company_name, subsidiary_id, status,
              ST_AsGeoJSON(location) as location_geojson,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              created_at, updated_at
       FROM mines WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mine not found' });
    }

    const mine = result.rows[0];

    // Scope check: non-DGMS users must be assigned to this mine or subsidiary
    if (req.user.role !== 'ROLE_DGMS_INSPECTOR') {
      if (req.user.mine_id && req.user.mine_id !== mine.id) {
        return res.status(403).json({ error: 'Access denied. Not your mine.' });
      }
      if (req.user.subsidiary_id && req.user.subsidiary_id !== mine.subsidiary_id) {
        return res.status(403).json({ error: 'Access denied. Not your subsidiary.' });
      }
    }

    res.json(mine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/mines — create a mine
exports.create = async (req, res) => {
  const { name, company_name, subsidiary_id, status, longitude, latitude } = req.body;
  try {
    let locationSql = 'NULL';
    const params = [name, company_name, subsidiary_id || null, status || 'active'];

    if (longitude && latitude) {
      params.push(longitude, latitude);
      locationSql = `ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)`;
    }

    const result = await db.query(
      `INSERT INTO mines (name, company_name, subsidiary_id, status, location)
       VALUES ($1, $2, $3, $4, ${locationSql})
       RETURNING id, name, company_name, subsidiary_id, status, created_at`,
      params
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/mines/:id — update a mine
exports.update = async (req, res) => {
  const { name, company_name, status } = req.body;
  try {
    // Scope check: manager can only update their own mine
    if (req.user.role === 'ROLE_MINE_MANAGER' && req.user.mine_id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied. Not your mine.' });
    }

    const result = await db.query(
      `UPDATE mines SET name = COALESCE($1, name),
                        company_name = COALESCE($2, company_name),
                        status = COALESCE($3, status),
                        updated_at = NOW()
       WHERE id = $4 AND deleted_at IS NULL
       RETURNING id, name, company_name, subsidiary_id, status, updated_at`,
      [name, company_name, status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mine not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
