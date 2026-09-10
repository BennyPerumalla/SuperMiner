// =============================================================
// Auth Schemas (Zod)
// =============================================================

const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['ROLE_MINER', 'ROLE_OVERMAN', 'ROLE_MINE_MANAGER', 'ROLE_DGMS_INSPECTOR']),
  mine_id: z.string().uuid().nullable().optional(),
  subsidiary_id: z.string().uuid().nullable().optional(),
  employee_id: z.string().optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

module.exports = { loginSchema, registerSchema, refreshSchema };
