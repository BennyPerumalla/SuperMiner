// =============================================================
// Inspections Service
// =============================================================
// When an inspection status changes to 'submitted', we write
// to the outbox_events table in the SAME transaction.
// This is the Transactional Outbox Pattern — the future Web3
// worker will consume these events.
// =============================================================

const db = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class InspectionsService {
  async findAll(tenantScope, filters = {}) {
    let query = db('inspections')
      .join('users', 'inspections.inspector_id', 'users.id')
      .join('mines', 'inspections.mine_id', 'mines.id')
      .whereNull('inspections.deleted_at')
      .select(
        'inspections.id', 'inspections.mine_id', 'inspections.inspector_id',
        'inspections.type', 'inspections.status', 'inspections.findings',
        'inspections.compliance_score', 'inspections.scheduled_at',
        'inspections.started_at', 'inspections.completed_at',
        'inspections.notes', 'inspections.created_at', 'inspections.updated_at',
        'users.full_name as inspector_name',
        'mines.name as mine_name'
      );

    if (!tenantScope.isGlobal) {
      query = query.where('inspections.mine_id', tenantScope.mineId);
    }

    if (filters.status) query = query.where('inspections.status', filters.status);
    if (filters.type) query = query.where('inspections.type', filters.type);

    return query.orderBy('inspections.created_at', 'desc');
  }

  async findById(id, tenantScope) {
    let query = db('inspections')
      .join('users', 'inspections.inspector_id', 'users.id')
      .join('mines', 'inspections.mine_id', 'mines.id')
      .where('inspections.id', id)
      .whereNull('inspections.deleted_at')
      .select(
        'inspections.*',
        'users.full_name as inspector_name',
        'mines.name as mine_name'
      );

    if (!tenantScope.isGlobal) {
      query = query.where('inspections.mine_id', tenantScope.mineId);
    }

    const inspection = await query.first();
    if (!inspection) throw new NotFoundError('Inspection not found');

    // Fetch items
    inspection.items = await db('inspection_items')
      .where('inspection_id', id)
      .whereNull('deleted_at')
      .orderBy('category');

    return inspection;
  }

  async create(data, user) {
    const { id: clientId, mine_id, ...fields } = data;

    const insertData = {
      ...fields,
      // DGMS inspectors specify the mine; others use their own
      mine_id: mine_id || user.mineId,
      inspector_id: user.id,
    };

    if (clientId) insertData.id = clientId;

    if (!insertData.mine_id) {
      throw new BadRequestError('mine_id is required for DGMS inspectors');
    }

    const [inspection] = await db('inspections')
      .insert(insertData)
      .returning('*');

    return inspection;
  }

  async update(id, data, tenantScope) {
    const existing = await this.findById(id, tenantScope);

    // ── Outbox event on status change to 'submitted' ────
    // This is the Transactional Outbox Pattern.
    if (data.status === 'submitted' && existing.status !== 'submitted') {
      await db.transaction(async (trx) => {
        data.updated_at = trx.fn.now();
        await trx('inspections').where('id', id).update(data);

        // Write outbox event in the SAME transaction
        await trx('outbox_events').insert({
          event_type: 'inspection_completed',
          aggregate_type: 'inspection',
          aggregate_id: id,
          payload: JSON.stringify({
            inspection_id: id,
            mine_id: existing.mine_id,
            inspector_id: existing.inspector_id,
            type: existing.type,
            compliance_score: data.compliance_score || existing.compliance_score,
            completed_at: data.completed_at || new Date().toISOString(),
          }),
        });
      });
    } else {
      data.updated_at = db.fn.now();
      await db('inspections').where('id', id).update(data);
    }

    return this.findById(id, tenantScope);
  }

  async softDelete(id, tenantScope) {
    await this.findById(id, tenantScope);
    await db('inspections')
      .where('id', id)
      .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });
  }
}

module.exports = new InspectionsService();
