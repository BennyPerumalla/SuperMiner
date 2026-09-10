const { z } = require('zod');

const createMineSchema = z.object({
  name: z.string().min(2).max(255),
  subsidiary_id: z.string().uuid(),
  license_number: z.string().max(100).optional(),
  mine_type: z.enum(['opencast', 'underground']),
  status: z.enum(['active', 'suspended', 'closed']).default('active'),
  annual_capacity_mt: z.number().positive().optional(),
  max_depth_meters: z.number().positive().optional(),
  district: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  // GeoJSON for PostGIS columns
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  }).optional(),
  location: z.object({
    type: z.literal('Point'),
    coordinates: z.array(z.number()).length(2),
  }).optional(),
});

const updateMineSchema = createMineSchema.partial();

module.exports = { createMineSchema, updateMineSchema };
