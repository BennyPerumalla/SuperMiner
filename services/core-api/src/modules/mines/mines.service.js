// =============================================================
// Mines Service
// =============================================================
// All queries are tenant-scoped using the tenantScope object
// injected by the authorize middleware. This is WHERE clause-level
// authorization — not just route-level.
// =============================================================

const db = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

class MinesService {
  /**
   * Get all mines visible to the current user.
   * DGMS: all mines. Others: only their assigned mine.
   */
  async findAll(tenantScope, filters = {}) {
    let query = db('mines')
      .whereNull('mines.deleted_at')
      .select(
        'mines.id', 'mines.name', 'mines.license_number',
        'mines.mine_type', 'mines.status', 'mines.annual_capacity_mt',
        'mines.max_depth_meters', 'mines.district', 'mines.state',
        'mines.subsidiary_id', 'mines.created_at', 'mines.updated_at',
        db.raw('ST_AsGeoJSON(mines.location)::json as location'),
        db.raw('ST_AsGeoJSON(mines.boundary)::json as boundary')
      );

    // Tenant scoping
    if (!tenantScope.isGlobal) {
      query = query.where('mines.mine_id', tenantScope.mineId)
        .orWhere('mines.id', tenantScope.mineId);
    }

    // Optional filters
    if (filters.status) query = query.where('mines.status', filters.status);
    if (filters.mine_type) query = query.where('mines.mine_type', filters.mine_type);
    if (filters.subsidiary_id) query = query.where('mines.subsidiary_id', filters.subsidiary_id);

    return query.orderBy('mines.name');
  }

  async findById(id, tenantScope) {
    let query = db('mines')
      .where('mines.id', id)
      .whereNull('mines.deleted_at')
      .select(
        'mines.*',
        db.raw('ST_AsGeoJSON(mines.location)::json as location_geojson'),
        db.raw('ST_AsGeoJSON(mines.boundary)::json as boundary_geojson')
      );

    if (!tenantScope.isGlobal) {
      query = query.where(function() {
        this.where('mines.id', tenantScope.mineId);
      });
    }

    const mine = await query.first();
    if (!mine) throw new NotFoundError('Mine not found');
    return mine;
  }

  async create(data) {
    const { boundary, location, ...fields } = data;

    const [mine] = await db('mines')
      .insert(fields)
      .returning('*');

    // Set PostGIS columns if provided
    if (location || boundary) {
      const updates = [];
      const params = [];

      if (location) {
        updates.push('location = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)');
        params.push(JSON.stringify(location));
      }
      if (boundary) {
        updates.push('boundary = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)');
        params.push(JSON.stringify(boundary));
      }

      await db.raw(
        `UPDATE mines SET ${updates.join(', ')} WHERE id = ?`,
        [...params, mine.id]
      );
    }

    return this.findById(mine.id, { isGlobal: true });
  }

  async update(id, data, tenantScope) {
    // Verify access
    await this.findById(id, tenantScope);

    const { boundary, location, ...fields } = data;

    if (Object.keys(fields).length > 0) {
      fields.updated_at = db.fn.now();
      await db('mines').where('id', id).update(fields);
    }

    // Update PostGIS columns
    if (location || boundary) {
      const updates = [];
      const params = [];

      if (location) {
        updates.push('location = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)');
        params.push(JSON.stringify(location));
      }
      if (boundary) {
        updates.push('boundary = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326)');
        params.push(JSON.stringify(boundary));
      }

      updates.push('updated_at = NOW()');
      await db.raw(
        `UPDATE mines SET ${updates.join(', ')} WHERE id = ?`,
        [...params, id]
      );
    }

    return this.findById(id, tenantScope);
  }

  async softDelete(id, tenantScope) {
    await this.findById(id, tenantScope);
    await db('mines')
      .where('id', id)
      .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });
  }
}

module.exports = new MinesService();
