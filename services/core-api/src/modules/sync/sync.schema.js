const { z } = require('zod');

// ── Pull schema ─────────────────────────────────
// last_pulled_at is a Unix timestamp in milliseconds.
// 0 or absent = first sync (pull everything).
const pullQuerySchema = z.object({
  last_pulled_at: z
    .string()
    .regex(/^\d+$/, 'Must be a Unix timestamp in milliseconds')
    .transform(Number)
    .default('0'),
});

// ── Push schema ─────────────────────────────────
// WatermelonDB sends changes grouped by table name.
// Each table has arrays of created, updated, and deleted records.
const tableChangesSchema = z.object({
  created: z.array(z.record(z.any())).default([]),
  updated: z.array(z.record(z.any())).default([]),
  deleted: z.array(z.string().uuid()).default([]),
});

const pushBodySchema = z.object({
  changes: z.object({
    incidents: tableChangesSchema.optional(),
    inspections: tableChangesSchema.optional(),
    inspection_items: tableChangesSchema.optional(),
  }),
  lastPulledAt: z.number().int().nonnegative(),
});

module.exports = { pullQuerySchema, pushBodySchema };
