// =============================================================
// Development Seed Data
// =============================================================
// Creates a realistic dataset for local development and demos:
//   - 2 subsidiaries (ECL, BCCL)
//   - 3 mines with PostGIS boundaries and locations
//   - Users for each role
//   - Sample incidents and inspections
//   - Sensors including a ventilation shaft (for spatial queries)
//
// All UUIDs are hardcoded for reproducibility — tests and
// Postman collections can reference them.
// =============================================================

const bcrypt = require('bcryptjs');

const SUBSIDIARY_ECL = '11111111-1111-1111-1111-111111111111';
const SUBSIDIARY_BCCL = '22222222-2222-2222-2222-222222222222';

const MINE_RAJMAHAL = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const MINE_SONEPUR = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const MINE_DHANBAD = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const USER_MINER = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const USER_OVERMAN = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const USER_MANAGER = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const USER_DGMS = '99999999-9999-9999-9999-999999999999';
const USER_MINER2 = 'dddddddd-dddd-dddd-dddd-dddddddddd22';

const INCIDENT_1 = '10000000-0000-0000-0000-000000000001';
const INCIDENT_2 = '10000000-0000-0000-0000-000000000002';
const INCIDENT_3 = '10000000-0000-0000-0000-000000000003';

const INSPECTION_1 = '20000000-0000-0000-0000-000000000001';
const INSPECTION_2 = '20000000-0000-0000-0000-000000000002';

const SENSOR_VENT = '30000000-0000-0000-0000-000000000001';
const SENSOR_GAS = '30000000-0000-0000-0000-000000000002';

exports.seed = async function (knex) {
  // Clean existing data (order matters due to foreign keys)
  await knex('outbox_events').del();
  await knex('inspection_items').del();
  await knex('inspections').del();
  await knex('incidents').del();
  await knex('sensors').del();
  await knex('users').del();
  await knex('mines').del();
  await knex('subsidiaries').del();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Subsidiaries ──────────────────────────────
  await knex('subsidiaries').insert([
    { id: SUBSIDIARY_ECL, name: 'Eastern Coalfields Limited', code: 'ECL' },
    { id: SUBSIDIARY_BCCL, name: 'Bharat Coking Coal Limited', code: 'BCCL' },
  ]);

  // ── Mines (with PostGIS geometries) ───────────
  // Coordinates are approximate real locations in Jharkhand/West Bengal
  await knex('mines').insert([
    {
      id: MINE_RAJMAHAL,
      subsidiary_id: SUBSIDIARY_ECL,
      name: 'Rajmahal Open Cast Project',
      license_number: 'ECL/RAJ/2024/001',
      mine_type: 'opencast',
      status: 'active',
      annual_capacity_mt: 15.5,
      district: 'Godda',
      state: 'Jharkhand',
    },
    {
      id: MINE_SONEPUR,
      subsidiary_id: SUBSIDIARY_ECL,
      name: 'Sonepur Bazari Underground',
      license_number: 'ECL/SON/2024/002',
      mine_type: 'underground',
      status: 'active',
      annual_capacity_mt: 8.2,
      max_depth_meters: 350,
      district: 'Asansol',
      state: 'West Bengal',
    },
    {
      id: MINE_DHANBAD,
      subsidiary_id: SUBSIDIARY_BCCL,
      name: 'Dhanbad Deep Mine',
      license_number: 'BCCL/DHA/2024/001',
      mine_type: 'underground',
      status: 'active',
      annual_capacity_mt: 5.0,
      max_depth_meters: 500,
      district: 'Dhanbad',
      state: 'Jharkhand',
    },
  ]);

  // Set PostGIS geometries via raw SQL
  await knex.raw(`
    UPDATE mines SET
      location = ST_SetSRID(ST_MakePoint(87.1234, 24.9876), 4326),
      boundary = ST_SetSRID(ST_GeomFromText('POLYGON((87.12 24.98, 87.13 24.98, 87.13 24.99, 87.12 24.99, 87.12 24.98))'), 4326)
    WHERE id = '${MINE_RAJMAHAL}';

    UPDATE mines SET
      location = ST_SetSRID(ST_MakePoint(86.9456, 23.6789), 4326),
      boundary = ST_SetSRID(ST_GeomFromText('POLYGON((86.94 23.67, 86.95 23.67, 86.95 23.69, 86.94 23.69, 86.94 23.67))'), 4326)
    WHERE id = '${MINE_SONEPUR}';

    UPDATE mines SET
      location = ST_SetSRID(ST_MakePoint(86.4567, 23.7890), 4326),
      boundary = ST_SetSRID(ST_GeomFromText('POLYGON((86.45 23.78, 86.46 23.78, 86.46 23.80, 86.45 23.80, 86.45 23.78))'), 4326)
    WHERE id = '${MINE_DHANBAD}';
  `);

  // ── Users ─────────────────────────────────────
  await knex('users').insert([
    {
      id: USER_MINER,
      subsidiary_id: SUBSIDIARY_ECL,
      mine_id: MINE_RAJMAHAL,
      email: 'miner@koyla.dev',
      password_hash: passwordHash,
      full_name: 'Raju Kumar',
      role: 'ROLE_MINER',
      employee_id: 'ECL-M-001',
    },
    {
      id: USER_MINER2,
      subsidiary_id: SUBSIDIARY_BCCL,
      mine_id: MINE_DHANBAD,
      email: 'miner2@koyla.dev',
      password_hash: passwordHash,
      full_name: 'Sunil Yadav',
      role: 'ROLE_MINER',
      employee_id: 'BCCL-M-001',
    },
    {
      id: USER_OVERMAN,
      subsidiary_id: SUBSIDIARY_ECL,
      mine_id: MINE_RAJMAHAL,
      email: 'overman@koyla.dev',
      password_hash: passwordHash,
      full_name: 'Ashok Sharma',
      role: 'ROLE_OVERMAN',
      employee_id: 'ECL-O-001',
    },
    {
      id: USER_MANAGER,
      subsidiary_id: SUBSIDIARY_ECL,
      mine_id: MINE_RAJMAHAL,
      email: 'manager@koyla.dev',
      password_hash: passwordHash,
      full_name: 'Priya Singh',
      role: 'ROLE_MINE_MANAGER',
      employee_id: 'ECL-MGR-001',
    },
    {
      id: USER_DGMS,
      subsidiary_id: null,
      mine_id: null,
      email: 'inspector@dgms.gov.in',
      password_hash: passwordHash,
      full_name: 'D.K. Mishra',
      role: 'ROLE_DGMS_INSPECTOR',
      employee_id: 'DGMS-INS-042',
    },
  ]);

  // ── Sensors ───────────────────────────────────
  await knex('sensors').insert([
    {
      id: SENSOR_VENT,
      mine_id: MINE_RAJMAHAL,
      name: 'Main Ventilation Shaft A',
      type: 'ventilation_shaft',
      status: 'active',
      zone: 'Zone A - North',
      last_reading: JSON.stringify({ airflow_cfm: 45000, temperature_c: 28.5 }),
    },
    {
      id: SENSOR_GAS,
      mine_id: MINE_RAJMAHAL,
      name: 'Methane Detector Panel 3',
      type: 'gas_detector',
      status: 'active',
      zone: 'Zone A - North',
      last_reading: JSON.stringify({ methane_ppm: 0.4, co_ppm: 12 }),
    },
  ]);

  await knex.raw(`
    UPDATE sensors SET location = ST_SetSRID(ST_MakePoint(87.1240, 24.9880), 4326) WHERE id = '${SENSOR_VENT}';
    UPDATE sensors SET location = ST_SetSRID(ST_MakePoint(87.1245, 24.9875), 4326) WHERE id = '${SENSOR_GAS}';
  `);

  // ── Incidents ─────────────────────────────────
  await knex('incidents').insert([
    {
      id: INCIDENT_1,
      mine_id: MINE_RAJMAHAL,
      reported_by: USER_MINER,
      type: 'safety_violation',
      severity: 'high',
      status: 'reported',
      description: 'Workers in Zone B operating without helmets. 3 miners observed.',
      metadata: JSON.stringify({ missing_items: ['helmet', 'safety_lamp'] }),
      occurred_at: new Date('2026-09-10T09:30:00Z'),
    },
    {
      id: INCIDENT_2,
      mine_id: MINE_RAJMAHAL,
      reported_by: USER_MINER,
      type: 'gas_leak',
      severity: 'critical',
      status: 'investigating',
      description: 'Methane levels exceeded safe threshold in Panel 3. Evacuation initiated.',
      metadata: JSON.stringify({ gas_type: 'methane', ppm_reading: 2.1, sensor_id: SENSOR_GAS }),
      occurred_at: new Date('2026-09-10T11:15:00Z'),
    },
    {
      id: INCIDENT_3,
      mine_id: MINE_DHANBAD,
      reported_by: USER_MINER2,
      type: 'roof_fall',
      severity: 'critical',
      status: 'reported',
      description: 'Minor roof fall in gallery 7. No injuries reported. Area sealed.',
      metadata: JSON.stringify({ affected_area_sqm: 25, evacuation_count: 12 }),
      occurred_at: new Date('2026-09-10T14:00:00Z'),
    },
  ]);

  // Place incidents near the ventilation shaft for spatial query testing
  await knex.raw(`
    UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(87.1242, 24.9878), 4326) WHERE id = '${INCIDENT_1}';
    UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(87.1248, 24.9882), 4326) WHERE id = '${INCIDENT_2}';
    UPDATE incidents SET location = ST_SetSRID(ST_MakePoint(86.4570, 23.7895), 4326) WHERE id = '${INCIDENT_3}';
  `);

  // ── Inspections ───────────────────────────────
  await knex('inspections').insert([
    {
      id: INSPECTION_1,
      mine_id: MINE_RAJMAHAL,
      inspector_id: USER_OVERMAN,
      type: 'routine',
      status: 'completed',
      compliance_score: 85.0,
      findings: JSON.stringify({
        summary: 'Overall satisfactory. PPE compliance needs improvement in Zone B.',
        critical_issues: 1,
        observations: 12,
      }),
      scheduled_at: new Date('2026-09-10T06:00:00Z'),
      started_at: new Date('2026-09-10T06:15:00Z'),
      completed_at: new Date('2026-09-10T08:30:00Z'),
      notes: 'Zone B workers warned about PPE compliance.',
    },
    {
      id: INSPECTION_2,
      mine_id: MINE_RAJMAHAL,
      inspector_id: USER_DGMS,
      type: 'compliance_audit',
      status: 'scheduled',
      scheduled_at: new Date('2026-09-15T09:00:00Z'),
      notes: 'Quarterly compliance audit by DGMS.',
    },
  ]);

  // ── Inspection Items ──────────────────────────
  await knex('inspection_items').insert([
    {
      inspection_id: INSPECTION_1,
      category: 'ventilation',
      description: 'Main ventilation system operating within parameters',
      compliant: true,
      notes: 'Airflow at 45,000 CFM',
    },
    {
      inspection_id: INSPECTION_1,
      category: 'ppe',
      description: 'All workers wearing mandatory PPE',
      compliant: false,
      notes: '3 workers in Zone B without helmets',
    },
    {
      inspection_id: INSPECTION_1,
      category: 'gas_monitoring',
      description: 'Gas detection systems calibrated and functional',
      compliant: true,
      notes: 'Last calibration: 2026-09-08',
    },
    {
      inspection_id: INSPECTION_1,
      category: 'fire_safety',
      description: 'Fire extinguishers present and within service date',
      compliant: true,
    },
    {
      inspection_id: INSPECTION_1,
      category: 'emergency_exits',
      description: 'Emergency exits clearly marked and unobstructed',
      compliant: true,
    },
  ]);
};
