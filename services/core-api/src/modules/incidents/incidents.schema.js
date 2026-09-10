const { z } = require('zod');

const createIncidentSchema = z.object({
  id: z.string().uuid().optional(), // Mobile-generated UUID for sync
  type: z.enum([
    'safety_violation', 'gas_leak', 'roof_fall', 'equipment_failure',
    'fire', 'flooding', 'ppe_violation', 'electrical_hazard',
    'blasting_incident', 'other',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(10),
  metadata: z.record(z.any()).optional(),
  evidence_url: z.string().url().optional(),
  occurred_at: z.string().datetime(),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2), // [longitude, latitude]
  }).optional(),
});

const updateIncidentSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['reported', 'acknowledged', 'investigating', 'resolved', 'closed']).optional(),
  description: z.string().min(10).optional(),
  metadata: z.record(z.any()).optional(),
  evidence_url: z.string().url().optional(),
});

module.exports = { createIncidentSchema, updateIncidentSchema };
