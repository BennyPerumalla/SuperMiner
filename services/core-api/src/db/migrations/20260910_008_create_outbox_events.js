// =============================================================
// Migration: Create outbox_events table
// =============================================================
// TRANSACTIONAL OUTBOX PATTERN:
//
// PROBLEM:
// When an inspection is completed, we need to eventually
// notify the Web3 worker to hash and anchor it on-chain.
// But we can't write to both PostgreSQL and a message queue
// atomically — this is the "dual write" problem.
//
// SOLUTION:
// Write the event into the SAME database, in the SAME
// transaction that updates the inspection status.
// A future worker polls this table for pending events.
//
// WHY NOT A MESSAGE QUEUE NOW:
// - Adding Kafka/RabbitMQ adds infrastructure complexity
//   we don't need until Web3 is implemented.
// - The outbox table IS the queue for now.
// - When we add the Web3 worker, it reads from this table.
// - If we later need Kafka, we can add a CDC (Change Data
//   Capture) connector that streams outbox changes to Kafka.
//
// STATUS LIFECYCLE:
//   pending → processing → processed (or failed)
//
// The worker uses SELECT ... FOR UPDATE SKIP LOCKED to
// claim events without blocking other workers.
// =============================================================

exports.up = function (knex) {
  return knex.schema.createTable('outbox_events', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('uuid_generate_v4()'));

    table.string('event_type', 100).notNullable(); // e.g., 'inspection_completed'
    table.string('aggregate_type', 100).notNullable(); // e.g., 'inspection'
    table.uuid('aggregate_id').notNullable(); // e.g., inspection UUID

    table.jsonb('payload').notNullable(); // Event data to be consumed

    table
      .enum('status', ['pending', 'processing', 'processed', 'failed'])
      .defaultTo('pending')
      .notNullable();

    table.integer('retry_count').defaultTo(0).notNullable();
    table.text('error_message').nullable();
    table.timestamp('processed_at', { useTz: true }).nullable();

    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now()).notNullable();

    // Indexes
    // The worker queries: WHERE status = 'pending' ORDER BY created_at
    table.index(['status', 'created_at'], 'idx_outbox_status_created');
    table.index(['aggregate_type', 'aggregate_id'], 'idx_outbox_aggregate');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('outbox_events');
};
