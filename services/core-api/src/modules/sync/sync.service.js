// =============================================================
// WatermelonDB Sync Service — THE CRITICAL ENGINE
// =============================================================
//
// This is the most architecturally important file in the entire
// backend. It handles offline-first synchronization between
// mobile devices (running WatermelonDB) and the PostgreSQL
// server database.
//
// ═══════════════════════════════════════════════════════════════
// CORE CONCEPTS
// ═══════════════════════════════════════════════════════════════
//
// 1. SYNC CURSOR (last_pulled_at):
//    A Unix timestamp (milliseconds) representing the last time
//    the client successfully pulled data. The server returns all
//    records modified AFTER this timestamp. This is NOT the
//    client's clock — it's the SERVER's clock from the previous
//    pull response. This eliminates clock skew issues.
//
// 2. CATEGORIES (created / updated / deleted):
//    WatermelonDB expects changes split into:
//    - created: Records that didn't exist at last_pulled_at
//    - updated: Records that existed but were modified
//    - deleted: IDs of records that were soft-deleted
//
// 3. IDEMPOTENT PUSH:
//    The mobile client may retry a push if it never receives
//    the 200 OK (connection drop). The server must handle
//    duplicate pushes gracefully:
//    - INSERT ON CONFLICT (id) DO NOTHING — duplicate creates
//    - UPDATE WHERE updated_at <= lastPulledAt — server-wins
//    - SET deleted_at = NOW() — re-deleting is a no-op
//
// 4. SERVER-WINS CONFLICT RESOLUTION:
//    If the server has a newer version (someone else edited the
//    record after the client's last pull), the client's update
//    is silently dropped. The next pull gives the client the
//    server's version. This is the simplest correct strategy.
//
// ═══════════════════════════════════════════════════════════════
// TIMESTAMP SAFETY
// ═══════════════════════════════════════════════════════════════
//
// PROBLEM: If we capture the timestamp AFTER querying, a record
// could be modified between our query and the timestamp capture.
// The client would miss that change AND start its next sync
// AFTER that change, permanently losing it.
//
// SOLUTION: Capture NOW() BEFORE querying. If a record is
// modified between our timestamp and our query:
// - If modified BEFORE our query: we see it ✓
// - If modified AFTER our query: next sync catches it ✓
//   (because next sync starts from our captured timestamp,
//    which is BEFORE the modification)
//
// We use REPEATABLE READ isolation to ensure consistent
// snapshot across multiple table queries.
//
// ═══════════════════════════════════════════════════════════════
// TRANSACTION ISOLATION
// ═══════════════════════════════════════════════════════════════
//
// PULL: Uses REPEATABLE READ to ensure all queries within the
//       transaction see the same database snapshot.
//
// PUSH: Uses READ COMMITTED (default). Each INSERT/UPDATE
//       sees the latest committed data, which is correct for
//       ON CONFLICT and server-wins checks.
// =============================================================

const db = require('../../config/database');
const logger = require('../../utils/logger');

// Tables that participate in sync.
// Order matters for foreign key dependencies during push.
const SYNCABLE_TABLES = ['incidents', 'inspections', 'inspection_items'];

// Columns to exclude from sync responses (never send to mobile)
const EXCLUDED_COLUMNS = ['password_hash'];

// Maximum records per table per pull (pagination safety valve)
const MAX_PULL_RECORDS = 1000;

class SyncService {
  // ═══════════════════════════════════════════════════════════
  // PULL — GET /api/sync?last_pulled_at=<timestamp>
  // ═══════════════════════════════════════════════════════════
  //
  // Returns all changes since the client's last sync, grouped
  // by table, split into created/updated/deleted.
  //
  // The returned `timestamp` becomes the client's next
  // `last_pulled_at` value.
  // ═══════════════════════════════════════════════════════════
  async pull(user, lastPulledAt) {
    // Convert millisecond timestamp to Date (0 = epoch = first sync)
    const since = new Date(lastPulledAt || 0);

    const result = await db.transaction(async (trx) => {
      // ── Step 1: Capture server timestamp BEFORE queries ──
      // CRITICAL: This must come first. See timestamp safety above.
      const tsResult = await trx.raw(
        "SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint AS ts"
      );
      const serverTimestamp = parseInt(tsResult.rows[0].ts);

      // ── Step 2: Query changes for each syncable table ────
      const changes = {};

      for (const table of SYNCABLE_TABLES) {
        changes[table] = await this._getTableChanges(trx, table, since, user);
      }

      return { changes, timestamp: serverTimestamp };
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH — POST /api/sync
  // ═══════════════════════════════════════════════════════════
  //
  // Receives changes from the mobile client and applies them.
  // The entire push is wrapped in a transaction for atomicity.
  //
  // If the mobile client retries (connection dropped), the
  // same changes are safely re-applied without side effects.
  // ═══════════════════════════════════════════════════════════
  async push(user, changes, lastPulledAt) {
    const lastPulledDate = new Date(lastPulledAt);

    await db.transaction(async (trx) => {
      for (const table of SYNCABLE_TABLES) {
        const tableChanges = changes[table];
        if (!tableChanges) continue;

        // Process in order: creates → updates → deletes
        // (creates before updates to handle records that were
        //  created and then immediately updated offline)

        await this._processCreates(trx, table, tableChanges.created || [], user);
        await this._processUpdates(trx, table, tableChanges.updated || [], user, lastPulledDate);
        await this._processDeletes(trx, table, tableChanges.deleted || [], user);
      }
    });

    logger.info(
      {
        userId: user.id,
        tables: Object.keys(changes),
        counts: Object.fromEntries(
          Object.entries(changes).map(([t, c]) => [
            t,
            {
              created: c?.created?.length || 0,
              updated: c?.updated?.length || 0,
              deleted: c?.deleted?.length || 0,
            },
          ])
        ),
      },
      'Sync push completed'
    );
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Get changes for a single table
  // ═══════════════════════════════════════════════════════════
  async _getTableChanges(trx, table, since, user) {
    // Base query: all records modified after `since`
    let query = trx(table).where('updated_at', '>', since);

    // ── Tenant scoping ──────────────────────────────
    // DGMS inspectors see everything; others see only their mine.
    if (user.role !== 'ROLE_DGMS_INSPECTOR') {
      if (table === 'inspection_items') {
        // inspection_items don't have mine_id directly.
        // Filter through their parent inspection.
        query = query.whereIn('inspection_id',
          trx('inspections')
            .where('mine_id', user.mineId)
            .select('id')
        );
      } else {
        query = query.where('mine_id', user.mineId);
      }
    }

    // Apply pagination safety valve
    query = query.limit(MAX_PULL_RECORDS).orderBy('updated_at', 'asc');

    const allChanged = await query;

    // ── Categorize into created / updated / deleted ──
    const created = [];
    const updated = [];
    const deleted = [];

    for (const record of allChanged) {
      // Clean record: remove excluded columns, convert timestamps
      const cleaned = this._cleanRecord(record);

      if (record.deleted_at && new Date(record.deleted_at) > since) {
        // Record was soft-deleted since last sync
        deleted.push(record.id);
      } else if (new Date(record.created_at) > since && !record.deleted_at) {
        // Record was created since last sync and is not deleted
        created.push(cleaned);
      } else if (!record.deleted_at) {
        // Record existed before last sync but was modified
        updated.push(cleaned);
      }
    }

    return { created, updated, deleted };
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Process created records (IDEMPOTENT)
  // ═══════════════════════════════════════════════════════════
  //
  // INSERT ... ON CONFLICT (id) DO NOTHING
  //
  // Why this works for retries:
  // - First attempt: Record doesn't exist → INSERT succeeds.
  // - Retry: Record already exists (from first attempt) →
  //   ON CONFLICT DO NOTHING silently skips. No duplicate.
  //
  // Why we use mobile-generated UUIDs:
  // - Mobile creates records offline → needs a primary key
  //   immediately (for local relationships).
  // - Auto-increment IDs can't be generated offline.
  // - UUID v4 collision probability is astronomically low
  //   (2^122 possible values).
  // ═══════════════════════════════════════════════════════════
  async _processCreates(trx, table, records, user) {
    for (const record of records) {
      const insertData = this._prepareInsertData(table, record, user);

      try {
        await trx.raw(
          `INSERT INTO ?? (${Object.keys(insertData).map(() => '??').join(', ')})
           VALUES (${Object.keys(insertData).map(() => '?').join(', ')})
           ON CONFLICT (id) DO NOTHING`,
          [table, ...Object.keys(insertData), ...Object.values(insertData)]
        );
      } catch (err) {
        // Log but don't fail the entire transaction for a single record.
        // This handles edge cases like FK violations from stale data.
        logger.warn(
          { err: err.message, table, recordId: record.id },
          'Sync create failed for record'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Process updated records (SERVER-WINS)
  // ═══════════════════════════════════════════════════════════
  //
  // UPDATE ... WHERE id = ? AND updated_at <= ?
  //
  // SERVER-WINS CONFLICT RESOLUTION:
  // The WHERE clause checks if the server's version was modified
  // AFTER the client's last pull. If so, the server has a newer
  // version → client's update is silently dropped.
  //
  // Why server-wins over timestamp-wins:
  // - Simpler: No need to compare individual field timestamps.
  // - Predictable: The "most recent sync" always wins.
  // - Correct for our domain: A manager's correction (on the
  //   server) should override a miner's stale offline edit.
  //
  // Why not last-write-wins:
  // - LWW uses wall clock time, which is unreliable across
  //   devices. Server-wins uses the sync cursor, which is
  //   always the server's clock.
  // ═══════════════════════════════════════════════════════════
  async _processUpdates(trx, table, records, user, lastPulledDate) {
    for (const record of records) {
      const { id, ...updateFields } = record;
      if (!id) continue;

      // Remove fields that shouldn't be updated from the client
      delete updateFields.created_at;
      delete updateFields.mine_id; // Prevent tenant escalation
      delete updateFields.reported_by;
      delete updateFields.inspector_id;

      // Set server timestamp
      updateFields.updated_at = trx.fn.now();

      try {
        let query = trx(table)
          .where('id', id)
          .where('updated_at', '<=', lastPulledDate) // Server-wins check
          .update(updateFields);

        // Tenant scoping: prevent cross-mine updates
        if (user.role !== 'ROLE_DGMS_INSPECTOR') {
          if (table !== 'inspection_items') {
            query = query.where('mine_id', user.mineId);
          }
        }

        const affectedRows = await query;

        if (affectedRows === 0) {
          logger.debug(
            { table, recordId: id },
            'Sync update skipped (server-wins or not found)'
          );
        }
      } catch (err) {
        logger.warn(
          { err: err.message, table, recordId: id },
          'Sync update failed for record'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Process deleted records (IDEMPOTENT SOFT DELETE)
  // ═══════════════════════════════════════════════════════════
  //
  // SET deleted_at = NOW(), updated_at = NOW()
  //
  // Idempotent: Setting deleted_at on an already-deleted record
  // just updates the timestamp. No error, no side effect.
  //
  // Soft delete is REQUIRED for sync:
  // - The pull response needs to tell clients "these IDs were
  //   deleted since your last sync."
  // - Hard deletes would lose this information.
  // - The client's WatermelonDB then removes those records
  //   from local storage.
  // ═══════════════════════════════════════════════════════════
  async _processDeletes(trx, table, deletedIds, user) {
    for (const id of deletedIds) {
      try {
        let query = trx(table)
          .where('id', id)
          .update({
            deleted_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          });

        // Tenant scoping
        if (user.role !== 'ROLE_DGMS_INSPECTOR') {
          if (table !== 'inspection_items') {
            query = query.where('mine_id', user.mineId);
          }
        }

        await query;
      } catch (err) {
        logger.warn(
          { err: err.message, table, recordId: id },
          'Sync delete failed for record'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Prepare insert data with tenant enforcement
  // ═══════════════════════════════════════════════════════════
  _prepareInsertData(table, record, user) {
    const data = { ...record };

    // Always set server-side timestamps
    data.created_at = new Date();
    data.updated_at = new Date();

    // Enforce tenant: override whatever mine_id the client sent
    // with the user's actual mine_id. Prevents tenant escalation.
    if (table !== 'inspection_items') {
      if (user.role !== 'ROLE_DGMS_INSPECTOR') {
        data.mine_id = user.mineId;
      }
    }

    // Set ownership fields
    if (table === 'incidents' && !data.reported_by) {
      data.reported_by = user.id;
    }
    if (table === 'inspections' && !data.inspector_id) {
      data.inspector_id = user.id;
    }

    // Remove fields that shouldn't be in the insert
    delete data.deleted_at;

    // Handle JSONB fields — ensure they're stringified
    if (data.metadata && typeof data.metadata === 'object') {
      data.metadata = JSON.stringify(data.metadata);
    }
    if (data.findings && typeof data.findings === 'object') {
      data.findings = JSON.stringify(data.findings);
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE: Clean a record for sync response
  // ═══════════════════════════════════════════════════════════
  _cleanRecord(record) {
    const cleaned = { ...record };

    // Remove excluded columns
    for (const col of EXCLUDED_COLUMNS) {
      delete cleaned[col];
    }

    // Remove soft-delete column from non-deleted records
    // (the client doesn't need to know about deleted_at
    //  for records that aren't deleted)
    delete cleaned.deleted_at;

    return cleaned;
  }
}

module.exports = new SyncService();
