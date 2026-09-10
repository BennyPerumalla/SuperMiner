const { z } = require('zod');

const createInspectionSchema = z.object({
  id: z.string().uuid().optional(),
  mine_id: z.string().uuid().optional(), // DGMS inspectors specify mine
  type: z.enum(['routine', 'safety_audit', 'compliance_audit', 'incident_followup']),
  scheduled_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateInspectionSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'submitted']).optional(),
  findings: z.record(z.any()).optional(),
  compliance_score: z.number().min(0).max(100).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  notes: z.string().optional(),
});

module.exports = { createInspectionSchema, updateInspectionSchema };
