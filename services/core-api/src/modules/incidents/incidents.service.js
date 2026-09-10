// =============================================================
// Incidents Service
// =============================================================
// Tenant-scoped CRUD for safety incidents.
// Key design: reported_by is always set from req.user.id
// (not from the request body) to prevent impersonation.
// =============================================================

const db = require('../../config/database');
const { NotFoundError } = require('../../utils/errors');

class IncidentsService {
  async findAll(tenantScope, filters = {}) {
    let query = db('incidents')
      .join('users', 'incidents.reported_by', 'users.id')
      .whereNull('incidents.deleted_at')
      .select(
        'incidents.id', 'incidents.mine_id', 'incidents.reported_by',
        'incidents.type', 'incidents.severity', 'incidents.status',
        'incidents.description', 'incidents.metadata', 'incidents.evidence_url',
        'incidents.occurred_at', 'incidents.created_at', 'incidents.updated_at',
        db.raw('ST_AsGeoJSON(incidents.location)::json as location'),
        'users.full_name as reporter_name'
      );

    // Tenant scoping
    if (!tenantScope.isGlobal) {
      query = query.where('incidents.mine_id', tenantScope.mineId);
    }

    if (filters.type) query = query.where('incidents.type', filters.type);
    if (filters.severity) query = query.where('incidents.severity', filters.severity);
    if (filters.status) query = query.where('incidents.status', filters.status);

    return query.orderBy('incidents.occurred_at', 'desc');
  }

  async findById(id, tenantScope) {
    let query = db('incidents')
      .join('users', 'incidents.reported_by', 'users.id')
      .where('incidents.id', id)
      .whereNull('incidents.deleted_at')
      .select(
        'incidents.*',
        db.raw('ST_AsGeoJSON(incidents.location)::json as location_geojson'),
        'users.full_name as reporter_name'
      );

    if (!tenantScope.isGlobal) {
      query = query.where('incidents.mine_id', tenantScope.mineId);
    }

    const incident = await query.first();
    if (!incident) throw new NotFoundError('Incident not found');
    return incident;
  }

  async create(data, user) {
    const { location, id: clientId, ...fields } = data;

    const insertData = {
      ...fields,
      mine_id: user.mineId,
      reported_by: user.id,
    };

    // If mobile provides a UUID, use it (for sync idempotency)
    if (clientId) insertData.id = clientId;

    const [incident] = await db('incidents')
      .insert(insertData)
      .returning('*');

    // Set PostGIS location if provided
    if (location) {
      await db.raw(
        'UPDATE incidents SET location = ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) WHERE id = ?',
        [JSON.stringify(location), incident.id]
      );
    }

    return this.findById(incident.id, { isGlobal: true });
  }

  async update(id, data, tenantScope) {
    await this.findById(id, tenantScope);

    const { ...fields } = data;
    fields.updated_at = db.fn.now();

    await db('incidents').where('id', id).update(fields);
    return this.findById(id, tenantScope);
  }

  async softDelete(id, tenantScope) {
    await this.findById(id, tenantScope);
    await db('incidents')
      .where('id', id)
      .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });
  }
}

module.exports = new IncidentsService();
