// =============================================================
// Migration: Create subsidiaries table
// =============================================================
// TOP of the entity hierarchy. Coal India has multiple
// subsidiaries (ECL, BCCL, CCL, etc.). Each subsidiary
// has multiple mines.
//
// WHY SUBSIDIARIES EXIST:
// Multi-tenancy. A Mine Manager sees their mine.
// A subsidiary-level report aggregates all mines
// under that subsidiary. DGMS inspectors see everything.
// =============================================================

exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "postgis"');

  return knex.schema.createTable('subsidiaries', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table.string('name', 255).notNullable();
    table.string('code', 50).notNullable().unique(); // e.g., 'ECL', 'BCCL'

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable(); // Soft delete

    // Index for soft-delete filtering — almost every query includes
    // WHERE deleted_at IS NULL, so this partial index covers them efficiently.
    table.index(['deleted_at'], 'idx_subsidiaries_deleted_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('subsidiaries');
};
