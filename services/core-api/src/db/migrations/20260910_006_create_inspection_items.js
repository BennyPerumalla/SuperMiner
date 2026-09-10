// =============================================================
// Migration: Create inspection_items table
// =============================================================
// Individual checklist items within an inspection.
// Each item represents a specific compliance check:
//   - "Ventilation system operational" → compliant: true
//   - "Fire extinguishers in place" → compliant: false
//
// The compliance_score on the parent inspection is calculated
// from the ratio of compliant items to total items.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('inspection_items', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('inspection_id')
      .notNullable()
      .references('id')
      .inTable('inspections')
      .onDelete('CASCADE'); // Deleting an inspection deletes its items

    table
      .enum('category', [
        'ventilation',
        'roof_support',
        'fire_safety',
        'electrical',
        'ppe',
        'gas_monitoring',
        'emergency_exits',
        'equipment',
        'housekeeping',
        'documentation',
        'other',
      ])
      .notNullable();

    table.text('description').notNullable();
    table.boolean('compliant').notNullable();
    table.text('evidence_url').nullable(); // Photo evidence
    table.text('notes').nullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes
    table.index(['inspection_id'], 'idx_inspection_items_inspection_id');
    table.index(['deleted_at'], 'idx_inspection_items_deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inspection_items');
};
