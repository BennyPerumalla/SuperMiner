// =============================================================
// Migration: Create inspections table
// =============================================================
// Inspections are formal compliance checks conducted by
// overmen (routine) or DGMS inspectors (compliance audits).
//
// COMPLIANCE_SCORE:
// A 0-100 score computed from individual inspection items.
// This is calculated server-side (not from mobile) to prevent
// manipulation. The brief mentions compliance scoring.
//
// STATUS LIFECYCLE:
//   scheduled → in_progress → completed → submitted
// The "submitted" status triggers the outbox event for the
// future Web3 worker to hash and anchor on-chain.
//
// FINDINGS (JSONB):
// Summary findings as structured JSON. Individual checklist
// items are in the inspection_items table.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('inspections', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('mine_id')
      .notNullable()
      .references('id')
      .inTable('mines')
      .onDelete('RESTRICT');

    table
      .uuid('inspector_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    table
      .enum('type', [
        'routine',        // Overman daily/weekly check
        'safety_audit',   // Comprehensive safety audit
        'compliance_audit', // DGMS-triggered compliance audit
        'incident_followup', // Post-incident verification
      ])
      .notNullable();

    table
      .enum('status', [
        'scheduled',
        'in_progress',
        'completed',
        'submitted',  // Triggers outbox event for Web3
      ])
      .defaultTo('scheduled')
      .notNullable();

    table.jsonb('findings').nullable(); // Summary findings

    table.decimal('compliance_score', 5, 2).nullable(); // 0.00 - 100.00

    table.timestamp('scheduled_at', { useTz: true }).nullable();
    table.timestamp('started_at', { useTz: true }).nullable();
    table.timestamp('completed_at', { useTz: true }).nullable();

    table.text('notes').nullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes
    table.index(['mine_id'], 'idx_inspections_mine_id');
    table.index(['inspector_id'], 'idx_inspections_inspector_id');
    table.index(['status'], 'idx_inspections_status');
    table.index(['type'], 'idx_inspections_type');
    table.index(['deleted_at'], 'idx_inspections_deleted_at');
    table.index(['mine_id', 'updated_at'], 'idx_inspections_mine_updated');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inspections');
};
