const { z } = require('zod');

const updateUserSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  role: z.enum(['ROLE_MINER', 'ROLE_OVERMAN', 'ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR']).optional(),
  mine_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  employee_id: z.string().max(100).optional(),
});

module.exports = { updateUserSchema };
