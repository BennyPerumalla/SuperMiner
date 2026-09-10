// =============================================================
// Migration: Create incidents table (with PostGIS)
// =============================================================
// Incidents are safety events reported by miners/overmen from
// the mobile app (often offline). Key design decisions:
//
// UUID PRIMARY KEY:
// Generated on the mobile device (offline). When the device
// syncs, it pushes the incident with the mobile-generated UUID.
// This is why we can't use auto-increment — two offline devices
// would generate conflicting IDs.
//
// LOCATION (PostGIS Point):
// Where the incident occurred. GPS coordinates captured by the
// mobile device's location sensor. Used for the required
// "find all violations within 500m of a ventilation shaft" query.
//
// METADATA (JSONB):
// Semi-structured data that varies by incident type:
//   - gas_leak: { gas_type, ppm_reading, sensor_id }
//   - roof_fall: { affected_area_sqm, evacuation_count }
//   - ppe_violation: { missing_items: ['helmet', 'lamp'] }
// JSONB avoids the EAV anti-pattern while remaining queryable.
//
// SOFT DELETE (deleted_at):
// WatermelonDB sync requires deleted IDs in the pull response.
// Hard deletes would lose this information.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('incidents', (table) => {
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
      .uuid('reported_by')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('RESTRICT');

    table
      .enum('type', [
        'safety_violation',
        'gas_leak',
        'roof_fall',
        'equipment_failure',
        'fire',
        'flooding',
        'ppe_violation',
        'electrical_hazard',
        'blasting_incident',
        'other',
      ])
      .notNullable();

    table
      .enum('severity', ['low', 'medium', 'high', 'critical'])
      .notNullable();

    table
      .enum('status', ['reported', 'acknowledged', 'investigating', 'resolved', 'closed'])
      .defaultTo('reported')
      .notNullable();

    table.text('description').notNullable();
    table.jsonb('metadata').nullable(); // Type-specific extra data
    table.text('evidence_url').nullable(); // S3 link to photo/video
    table.timestamp('occurred_at', { useTz: true }).notNullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes for common queries
    table.index(['mine_id'], 'idx_incidents_mine_id');
    table.index(['reported_by'], 'idx_incidents_reported_by');
    table.index(['type'], 'idx_incidents_type');
    table.index(['severity'], 'idx_incidents_severity');
    table.index(['status'], 'idx_incidents_status');
    table.index(['deleted_at'], 'idx_incidents_deleted_at');

    // Composite index for sync queries:
    // SELECT * FROM incidents WHERE mine_id = ? AND updated_at > ?
    table.index(['mine_id', 'updated_at'], 'idx_incidents_mine_updated');
  }).then(() => {
    return knex.raw(`
      ALTER TABLE incidents
        ADD COLUMN location geometry(Point, 4326);

      CREATE INDEX idx_incidents_location_gist ON incidents USING GIST (location);
    `);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('incidents');
};
