const db = require('../db');

/**
 * PostGIS Spatial Queries
 *
 * All spatial queries use SRID 4326 (WGS84 — standard GPS coordinates).
 * ST_DWithin with ::geography cast gives distances in meters.
 */

// GET /api/spatial/incidents/nearby?lat=23.74&lng=86.42&radius=500
// Find incidents within a radius (meters) of a point
exports.incidentsNearby = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }

    const searchRadius = parseInt(radius) || 500; // default 500 meters

    const result = await db.query(
      `SELECT id, watermelon_id, mine_id, reported_by, description, severity, status,
              ST_AsGeoJSON(location) as location_geojson,
              ST_Distance(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters,
              reported_at
       FROM incidents
       WHERE location IS NOT NULL
         AND deleted_at IS NULL
         AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
       ORDER BY distance_meters`,
      [parseFloat(lng), parseFloat(lat), searchRadius]
    );

    res.json({
      query: { lat: parseFloat(lat), lng: parseFloat(lng), radius: searchRadius },
      count: result.rows.length,
      incidents: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/spatial/violations/near-shaft/:shaftId?radius=500
// "Find all safety violations reported within 500m of a specific ventilation shaft"
exports.violationsNearShaft = async (req, res) => {
  try {
    const { shaftId } = req.params;
    const radius = parseInt(req.query.radius) || 500;

    // First verify the shaft exists
    const shaftResult = await db.query(
      `SELECT id, name, mine_id, ST_AsGeoJSON(location) as location_geojson
       FROM ventilation_shafts WHERE id = $1`,
      [shaftId]
    );

    if (shaftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ventilation shaft not found' });
    }

    const shaft = shaftResult.rows[0];

    // Find incidents near this shaft
    const result = await db.query(
      `SELECT i.id, i.watermelon_id, i.mine_id, i.reported_by, i.description,
              i.severity, i.status,
              ST_AsGeoJSON(i.location) as location_geojson,
              ST_Distance(i.location::geography, vs.location::geography) as distance_meters,
              i.reported_at
       FROM incidents i, ventilation_shafts vs
       WHERE vs.id = $1
         AND i.location IS NOT NULL
         AND i.deleted_at IS NULL
         AND ST_DWithin(i.location::geography, vs.location::geography, $2)
       ORDER BY distance_meters`,
      [shaftId, radius]
    );

    res.json({
      shaft: shaft,
      radius: radius,
      count: result.rows.length,
      incidents: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/spatial/mines/:id/boundary
// Get mine boundary as GeoJSON
exports.mineBoundary = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, company_name,
              ST_AsGeoJSON(location) as location_geojson,
              ST_AsGeoJSON(boundary) as boundary_geojson
       FROM mines WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mine not found' });
    }

    const mine = result.rows[0];

    // Return as a GeoJSON Feature for easy mapping
    res.json({
      type: 'Feature',
      properties: {
        id: mine.id,
        name: mine.name,
        company_name: mine.company_name
      },
      geometry: mine.boundary_geojson ? JSON.parse(mine.boundary_geojson) : null,
      point: mine.location_geojson ? JSON.parse(mine.location_geojson) : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
