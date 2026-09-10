// =============================================================
// Migration: Create mines table (with PostGIS)
// =============================================================
// Central entity. Every operational record (incident, inspection,
// sensor reading) is scoped to a mine. The mine has:
//   - boundary: Polygon geometry (the physical boundary on a map)
//   - location: Point geometry (centroid / entrance coordinates)
//
// PostGIS GEOMETRY vs GEOGRAPHY:
// We store as geometry(*, 4326) for GiST index compatibility
// and GeoJSON compatibility. When we need distance in meters
// (e.g., "incidents within 500m"), we cast to geography at
// query time: column::geography.
//
// SRID 4326 = WGS84, the GPS coordinate system.
// This means coordinates are in (longitude, latitude) format.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('mines', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table
      .uuid('subsidiary_id')
      .notNullable()
      .references('id')
      .inTable('subsidiaries')
      .onDelete('RESTRICT');  // Never orphan a mine

    table.string('name', 255).notNullable();
    table.string('license_number', 100).unique();

    // Mine type: opencast or underground — affects safety protocols
    table.enum('mine_type', ['opencast', 'underground']).notNullable();

    table.enum('status', ['active', 'suspended', 'closed']).defaultTo('active').notNullable();

    // Capacity, depth info
    table.decimal('annual_capacity_mt', 10, 2).nullable(); // million tonnes
    table.decimal('max_depth_meters', 10, 2).nullable();

    // Address/region (non-spatial, for display/search)
    table.string('district', 255).nullable();
    table.string('state', 255).nullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes
    table.index(['subsidiary_id'], 'idx_mines_subsidiary_id');
    table.index(['status'], 'idx_mines_status');
    table.index(['deleted_at'], 'idx_mines_deleted_at');
  }).then(() => {
    // PostGIS columns must be added via raw SQL because Knex
    // doesn't have native PostGIS support.
    return knex.raw(`
      ALTER TABLE mines
        ADD COLUMN boundary geometry(Polygon, 4326),
        ADD COLUMN location geometry(Point, 4326);

      -- GiST index for spatial queries on mine boundaries.
      -- GiST (Generalized Search Tree) is the standard index type
      -- for PostGIS. It enables R-tree-like spatial lookups.
      -- Without this, every spatial query is a sequential scan.
      CREATE INDEX idx_mines_boundary_gist ON mines USING GIST (boundary);
      CREATE INDEX idx_mines_location_gist ON mines USING GIST (location);
    `);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('mines');
};
