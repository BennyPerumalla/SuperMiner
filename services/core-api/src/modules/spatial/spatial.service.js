// =============================================================
// Spatial Service (PostGIS Queries)
// =============================================================
//
// PostGIS CONCEPTS:
//
// GEOMETRY vs GEOGRAPHY:
// - geometry: Flat 2D plane. Fast. Distances in SRID units
//   (degrees for SRID 4326). Inaccurate for real-world distances.
// - geography: Spherical Earth. Slower. Distances in meters.
//   Accurate for real-world distances.
//
// We store as geometry(Point, 4326) but CAST TO GEOGRAPHY
// for distance calculations:
//   column::geography
// This gives us GiST index performance (on geometry) with
// accurate meter-based distances (via geography cast).
//
// ST_DWithin(geog1, geog2, meters):
// Returns true if two geographies are within `meters` of each
// other. Uses the spatial index for fast pruning.
//
// GiST INDEX:
// Generalized Search Tree. PostgreSQL's extensible indexing
// framework used by PostGIS for spatial data. It enables:
// - R-tree-like bounding box searches
// - O(log n) spatial queries instead of O(n) sequential scans
// - Essential for ST_DWithin, ST_Contains, ST_Intersects
//
// Without GiST: Every query scans ALL rows and computes
// distance for each. With GiST: Index narrows to nearby
// rows first, then computes exact distance for the few
// candidates.
// =============================================================

const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class SpatialService {
  /**
   * THE REQUIRED QUERY:
   * Find all safety violations within 500 meters of a
   * specific ventilation shaft.
   *
   * Uses ST_DWithin with geography cast for accurate
   * meter-based distance on Earth's surface.
   *
   * @param {string} shaftId - UUID of the ventilation shaft sensor
   * @param {number} radiusMeters - Search radius (default 500)
   * @param {object} tenantScope - Tenant scoping from middleware
   */
  async findViolationsNearShaft(shaftId, radiusMeters = 500, tenantScope) {
    // First verify the shaft exists and is a ventilation_shaft
    const shaft = await db('sensors')
      .where('id', shaftId)
      .where('type', 'ventilation_shaft')
      .whereNull('deleted_at')
      .first();

    if (!shaft) {
      throw new NotFoundError('Ventilation shaft sensor not found');
    }

    let query = db.raw(`
      SELECT
        i.id,
        i.type,
        i.severity,
        i.status,
        i.description,
        i.occurred_at,
        i.created_at,
        ST_AsGeoJSON(i.location)::json AS location,
        ST_Distance(
          i.location::geography,
          s.location::geography
        ) AS distance_meters,
        u.full_name AS reporter_name
      FROM incidents i
      JOIN sensors s ON s.mine_id = i.mine_id
      LEFT JOIN users u ON u.id = i.reported_by
      WHERE s.id = ?
        AND s.type = 'ventilation_shaft'
        AND i.type = 'safety_violation'
        AND i.deleted_at IS NULL
        AND i.location IS NOT NULL
        AND s.location IS NOT NULL
        AND ST_DWithin(
          i.location::geography,
          s.location::geography,
          ?
        )
      ORDER BY distance_meters ASC
    `, [shaftId, radiusMeters]);

    // Add tenant scoping
    if (!tenantScope.isGlobal) {
      query = db.raw(`
        SELECT
          i.id,
          i.type,
          i.severity,
          i.status,
          i.description,
          i.occurred_at,
          i.created_at,
          ST_AsGeoJSON(i.location)::json AS location,
          ST_Distance(
            i.location::geography,
            s.location::geography
          ) AS distance_meters,
          u.full_name AS reporter_name
        FROM incidents i
        JOIN sensors s ON s.mine_id = i.mine_id
        LEFT JOIN users u ON u.id = i.reported_by
        WHERE s.id = ?
          AND s.type = 'ventilation_shaft'
          AND i.type = 'safety_violation'
          AND i.mine_id = ?
          AND i.deleted_at IS NULL
          AND i.location IS NOT NULL
          AND s.location IS NOT NULL
          AND ST_DWithin(
            i.location::geography,
            s.location::geography,
            ?
          )
        ORDER BY distance_meters ASC
      `, [shaftId, tenantScope.mineId, radiusMeters]);
    }

    const result = await query;
    return result.rows;
  }

  /**
   * Find all incidents within a radius of a given point.
   * Generic version of the shaft query.
   */
  async findIncidentsNearPoint(longitude, latitude, radiusMeters, tenantScope) {
    if (!longitude || !latitude) {
      throw new BadRequestError('longitude and latitude are required');
    }

    let query = db.raw(`
      SELECT
        i.id,
        i.type,
        i.severity,
        i.description,
        i.occurred_at,
        ST_AsGeoJSON(i.location)::json AS location,
        ST_Distance(
          i.location::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
        ) AS distance_meters
      FROM incidents i
      WHERE i.deleted_at IS NULL
        AND i.location IS NOT NULL
        AND ST_DWithin(
          i.location::geography,
          ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
          ?
        )
        ${!tenantScope.isGlobal ? 'AND i.mine_id = ?' : ''}
      ORDER BY distance_meters ASC
    `, !tenantScope.isGlobal
      ? [longitude, latitude, longitude, latitude, radiusMeters, tenantScope.mineId]
      : [longitude, latitude, longitude, latitude, radiusMeters]
    );

    const result = await query;
    return result.rows;
  }

  /**
   * Check if a point is within a mine's boundary.
   */
  async isPointInMineBoundary(mineId, longitude, latitude) {
    const result = await db.raw(`
      SELECT ST_Contains(
        boundary,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)
      ) AS is_inside
      FROM mines
      WHERE id = ? AND boundary IS NOT NULL AND deleted_at IS NULL
    `, [longitude, latitude, mineId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Mine not found or has no boundary');
    }

    return result.rows[0].is_inside;
  }

  /**
   * Get all sensors for a mine with their locations as GeoJSON.
   */
  async getMineSensors(mineId, tenantScope) {
    let query = db('sensors')
      .where('mine_id', mineId)
      .whereNull('deleted_at')
      .select(
        'id', 'name', 'type', 'status', 'last_reading', 'last_reading_at',
        'zone', 'depth_meters',
        db.raw('ST_AsGeoJSON(location)::json as location')
      );

    if (!tenantScope.isGlobal && tenantScope.mineId !== mineId) {
      return []; // No access to other mines' sensors
    }

    return query.orderBy('type');
  }
}

module.exports = new SpatialService();
