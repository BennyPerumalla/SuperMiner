// =============================================================
// Migration: Create users table
// =============================================================
// Users are assigned to a subsidiary AND a mine.
// Exception: DGMS inspectors have subsidiary_id = NULL and
// mine_id = NULL (global access).
//
// PASSWORD HASHING:
// We store bcrypt hashes, never plaintext. bcrypt is:
// - Adaptive: cost factor increases with hardware speed
// - Salt-embedded: each hash includes a unique salt
// - Slow by design: ~250ms per hash = 4 hashes/second
//   (makes brute force infeasible)
//
// WHY NOT ARGON2:
// Argon2 is theoretically superior (memory-hard, won PHC).
// But bcryptjs is pure JS (no native compilation issues in
// Docker/Alpine), battle-tested for 20+ years, and has no
// known practical vulnerabilities.
//
// UNIQUE EMAIL CONSTRAINT:
// Uses a partial unique index: UNIQUE WHERE deleted_at IS NULL.
// This allows soft-deleted users to be re-registered with the
// same email (e.g., rehired employee).
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('subsidiary_id')
      .nullable()  // NULL for DGMS inspectors (global access)
      .references('id')
      .inTable('subsidiaries')
      .onDelete('RESTRICT');

    table
      .uuid('mine_id')
      .nullable()  // NULL for DGMS inspectors and subsidiary-level roles
      .references('id')
      .inTable('mines')
      .onDelete('RESTRICT');

    table.string('email', 255).notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 255).notNullable();

    table
      .enum('role', [
        'ROLE_MINER',
        'ROLE_OVERMAN',
        'ROLE_MINE_MANAGER',
        'ROLE_DGMS_INSPECTOR',
      ])
      .notNullable();

    // Employee ID from the coal company's HR system
    table.string('employee_id', 100).nullable();

    table.boolean('is_active').defaultTo(true).notNullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes
    table.index(['mine_id'], 'idx_users_mine_id');
    table.index(['subsidiary_id'], 'idx_users_subsidiary_id');
    table.index(['role'], 'idx_users_role');
    table.index(['deleted_at'], 'idx_users_deleted_at');
  }).then(() => {
    // Partial unique index: email must be unique ONLY among
    // non-deleted users. This allows soft-deleted users to be
    // re-registered with the same email.
    return knex.raw(`
      CREATE UNIQUE INDEX idx_users_email_unique
      ON users (email)
      WHERE deleted_at IS NULL;
    `);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
