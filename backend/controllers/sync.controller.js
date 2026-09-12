const db = require('../db');

/**
 * WatermelonDB Sync Protocol
 *
 * PULL (GET /api/sync?last_pulled_at=0):
 *   Returns created, updated, and deleted records since the given timestamp.
 *   WatermelonDB expects this exact response shape.
 *
 * PUSH (POST /api/sync):
 *   Receives changes from the mobile app.
 *   Uses ON CONFLICT (watermelon_id) DO NOTHING for duplicate-safe retries.
 *   Uses "server wins" conflict resolution.
 */

// GET /api/sync?last_pulled_at=0
exports.pull = async (req, res) => {
  try {
    const lastPulledAt = parseInt(req.query.last_pulled_at) || 0;
    // Convert millisecond timestamp to ISO date (WatermelonDB sends ms)
    const since = lastPulledAt === 0
      ? new Date(0).toISOString()
      : new Date(lastPulledAt).toISOString();

    // Build scope filter based on user role
    let scopeFilter = '';
    let scopeParams = [since];

    if (req.user.role !== 'ROLE_DGMS_INSPECTOR' && req.user.mine_id) {
      scopeFilter = 'AND mine_id = $2';
      scopeParams = [since, req.user.mine_id];
    }

    // For each synced table, get created, updated, and deleted records
    const changes = {};

    for (const table of ['incidents', 'inspections']) {
      // CREATED: records created after last pull that aren't deleted
      const created = await db.query(
        `SELECT * FROM ${table}
         WHERE created_at > $1 AND deleted_at IS NULL ${scopeFilter.replace('$2', '$' + scopeParams.length)}
         ORDER BY created_at`,
        scopeParams
      );

      // UPDATED: records updated after last pull, but created before
      // (so they're not double-counted as both created and updated)
      const updated = await db.query(
        `SELECT * FROM ${table}
         WHERE updated_at > $1 AND created_at <= $1 AND deleted_at IS NULL ${scopeFilter.replace('$2', '$' + scopeParams.length)}
         ORDER BY updated_at`,
        scopeParams
      );

      // DELETED: records soft-deleted after last pull — return only IDs
      const deleted = await db.query(
        `SELECT watermelon_id FROM ${table}
         WHERE deleted_at > $1 AND watermelon_id IS NOT NULL ${scopeFilter.replace('$2', '$' + scopeParams.length)}`,
        scopeParams
      );

      changes[table] = {
        created: created.rows.map(row => formatForSync(row, table)),
        updated: updated.rows.map(row => formatForSync(row, table)),
        deleted: deleted.rows.map(row => row.watermelon_id)
      };
    }

    const now = Date.now();

    res.json({ changes, timestamp: now });
  } catch (error) {
    console.error('Sync pull error:', error);
    res.status(500).json({ error: 'Sync pull failed' });
  }
};

// POST /api/sync
exports.push = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { changes, lastPulledAt } = req.body;

    if (!changes) {
      return res.status(400).json({ error: 'changes object is required' });
    }

    const lastPulledDate = lastPulledAt
      ? new Date(lastPulledAt).toISOString()
      : new Date(0).toISOString();

    await client.query('BEGIN');

    // Process each table
    for (const table of ['incidents', 'inspections']) {
      const tableChanges = changes[table];
      if (!tableChanges) continue;

      // CREATED records from mobile
      if (tableChanges.created && tableChanges.created.length > 0) {
        for (const record of tableChanges.created) {
          if (table === 'incidents') {
            await client.query(
              `INSERT INTO incidents (watermelon_id, mine_id, reported_by, description, severity, status)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (watermelon_id) DO NOTHING`,
              [
                record.id, // WatermelonDB sends its local ID as 'id'
                record.mine_id || req.user.mine_id,
                req.user.id,
                record.description,
                record.severity || 'low',
                record.status || 'open'
              ]
            );
          } else if (table === 'inspections') {
            await client.query(
              `INSERT INTO inspections (watermelon_id, mine_id, inspector_id, status, notes)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (watermelon_id) DO NOTHING`,
              [
                record.id,
                record.mine_id || req.user.mine_id,
                req.user.id,
                record.status || 'pending',
                record.notes || null
              ]
            );
          }
        }
      }

      // UPDATED records from mobile
      // Server Wins: only apply update if server record hasn't changed since lastPulledAt
      if (tableChanges.updated && tableChanges.updated.length > 0) {
        for (const record of tableChanges.updated) {
          if (table === 'incidents') {
            await client.query(
              `UPDATE incidents
               SET description = $1, severity = $2, status = $3, updated_at = NOW()
               WHERE watermelon_id = $4 AND updated_at <= $5 AND deleted_at IS NULL`,
              [
                record.description,
                record.severity || 'low',
                record.status || 'open',
                record.id,
                lastPulledDate
              ]
            );
          } else if (table === 'inspections') {
            await client.query(
              `UPDATE inspections
               SET status = $1, notes = $2, updated_at = NOW()
               WHERE watermelon_id = $3 AND updated_at <= $4 AND deleted_at IS NULL`,
              [
                record.status || 'pending',
                record.notes || null,
                record.id,
                lastPulledDate
              ]
            );
          }
        }
      }

      // DELETED records from mobile
      if (tableChanges.deleted && tableChanges.deleted.length > 0) {
        for (const watermelonId of tableChanges.deleted) {
          await client.query(
            `UPDATE ${table} SET deleted_at = NOW(), updated_at = NOW()
             WHERE watermelon_id = $1 AND deleted_at IS NULL`,
            [watermelonId]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync push error:', error);
    res.status(500).json({ error: 'Sync push failed' });
  } finally {
    client.release();
  }
};

/**
 * Format a database row for WatermelonDB sync response.
 * WatermelonDB expects 'id' to be the watermelon_id.
 */
function formatForSync(row, table) {
  const formatted = {
    id: row.watermelon_id || String(row.id),
    mine_id: row.mine_id,
    status: row.status,
    created_at: row.created_at ? new Date(row.created_at).getTime() : null,
    updated_at: row.updated_at ? new Date(row.updated_at).getTime() : null
  };

  if (table === 'incidents') {
    formatted.reported_by = row.reported_by;
    formatted.description = row.description;
    formatted.severity = row.severity;
    formatted.reported_at = row.reported_at ? new Date(row.reported_at).getTime() : null;
  } else if (table === 'inspections') {
    formatted.inspector_id = row.inspector_id;
    formatted.notes = row.notes;
    formatted.inspection_date = row.inspection_date ? new Date(row.inspection_date).getTime() : null;
  }

  return formatted;
}
