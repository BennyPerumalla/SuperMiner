// =============================================================
// Migration: Create sensors table (IoT + PostGIS)
// =============================================================
// Sensors represent IoT devices and fixed installations in mines:
//   - ventilation_shaft: The required spatial query target
//   - gas_detector: Methane, CO, CO2 monitoring
//   - temperature: Underground temperature monitoring
//   - seismic: Ground movement detection
//
// Each sensor has a Point location for spatial queries.
// The "500m from ventilation shaft" query joins this table
// with the incidents table using ST_DWithin.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('sensors', (table) => {
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

    table.string('name', 255).notNullable();

    table
      .enum('type', [
        'ventilation_shaft',
        'gas_detector',
        'temperature',
        'seismic',
        'water_level',
        'dust',
        'camera',
      ])
      .notNullable();

    table
      .enum('status', ['active', 'inactive', 'maintenance', 'faulty'])
      .defaultTo('active')
      .notNullable();

    table.jsonb('last_reading').nullable(); // Latest sensor reading
    table.timestamp('last_reading_at', { useTz: true }).nullable();

    // Installation info
    table.string('zone', 255).nullable(); // Mine zone/section
    table.decimal('depth_meters', 10, 2).nullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at', { useTz: true }).nullable();

    // Indexes
    table.index(['mine_id'], 'idx_sensors_mine_id');
    table.index(['type'], 'idx_sensors_type');
    table.index(['status'], 'idx_sensors_status');
    table.index(['deleted_at'], 'idx_sensors_deleted_at');
  }).then(() => {
    return knex.raw(`
      ALTER TABLE sensors
        ADD COLUMN location geometry(Point, 4326);

      CREATE INDEX idx_sensors_location_gist ON sensors USING GIST (location);
    `);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sensors');
};
