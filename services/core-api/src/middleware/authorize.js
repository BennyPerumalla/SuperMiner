// =============================================================
// Authorization Middleware (RBAC + Tenant Scoping)
// =============================================================
// This is LEVELS 2 and 3 of our authorization chain.
//
// LEVEL 2 — ROLE-BASED ACCESS CONTROL (RBAC):
// Checks if the user's role has permission for the requested
// resource and action. The permission matrix is defined as a
// static object — no database lookup needed.
//
// LEVEL 3 — TENANT SCOPING:
// Even if the role has permission, we must verify the user
// belongs to the mine/subsidiary they're accessing. A
// ROLE_MINE_MANAGER for Mine A cannot access Mine B's data.
//
// WHY BOTH LEVELS:
// Role-only checks are insufficient for multi-tenant systems.
// Example: Two mine managers (both ROLE_MINE_MANAGER) should
// each see only their own mine's data. Role checks alone
// would give them access to each other's mines.
//
// HOW TENANT SCOPING WORKS:
// The middleware attaches `req.tenantScope` with the appropriate
// mine_id and/or subsidiary_id. Service layer methods use this
// scope in their WHERE clauses. This means tenant isolation is
// enforced at the query level, not just the route level.
// =============================================================

const { ForbiddenError } = require('../utils/errors');

// ── Permission Matrix ────────────────────────────────────
// Maps: role → resource → allowed actions
// This is the single source of truth for RBAC.
// If you need to add a permission, add it here.
const PERMISSIONS = {
  ROLE_MINER: {
    incidents: ['create', 'read'],
    inspections: ['read'],
    mines: ['read'],
    sync: ['pull', 'push'],
  },
  ROLE_OVERMAN: {
    incidents: ['create', 'read', 'update'],
    inspections: ['create', 'read', 'update'],
    mines: ['read'],
    sync: ['pull', 'push'],
  },
  ROLE_MINE_MANAGER: {
    incidents: ['read', 'update'],
    inspections: ['read', 'update'],
    mines: ['read', 'update'],
    users: ['read', 'create', 'update'],
    sync: ['pull', 'push'],
  },
  ROLE_DGMS_INSPECTOR: {
    incidents: ['read'],
    inspections: ['create', 'read'],
    mines: ['read'],
    users: ['read'],
    sync: ['pull'],
    compliance: ['trigger'],
  },
};

// ── Roles that have global access (no tenant scoping) ────
// DGMS inspectors can see data across all subsidiaries/mines.
const GLOBAL_ROLES = ['ROLE_DGMS_INSPECTOR'];

/**
 * Creates an authorization middleware for a specific resource and action.
 *
 * Usage in routes:
 *   router.get('/incidents', authenticate, authorize('incidents', 'read'), controller.findAll);
 *   router.post('/incidents', authenticate, authorize('incidents', 'create'), controller.create);
 *
 * @param {string} resource - The resource being accessed (e.g., 'incidents', 'mines')
 * @param {string} action - The action being performed (e.g., 'read', 'create', 'update', 'delete')
 * @returns {Function} Express middleware
 */
function authorize(resource, action) {
  return (req, res, next) => {
    try {
      const { role, mineId, subsidiaryId } = req.user;

      // ── Level 2: Check role permission ──────────
      const rolePermissions = PERMISSIONS[role];
      if (!rolePermissions) {
        throw new ForbiddenError(`Unknown role: ${role}`);
      }

      const resourcePermissions = rolePermissions[resource];
      if (!resourcePermissions || !resourcePermissions.includes(action)) {
        throw new ForbiddenError(
          `Role ${role} does not have ${action} permission on ${resource}`
        );
      }

      // ── Level 3: Build tenant scope ─────────────
      // Global roles (DGMS Inspector) get no tenant filter.
      // All other roles are scoped to their mine_id.
      if (GLOBAL_ROLES.includes(role)) {
        req.tenantScope = { isGlobal: true };
      } else {
        if (!mineId) {
          throw new ForbiddenError('User has no mine assignment');
        }
        req.tenantScope = {
          isGlobal: false,
          mineId,
          subsidiaryId,
        };
      }

      // ── Route-level mine_id check ───────────────
      // If the route has :mineId param, verify the user owns it.
      // This prevents URL manipulation (e.g., /api/mines/other-mine-id).
      if (req.params.mineId && !GLOBAL_ROLES.includes(role)) {
        if (req.params.mineId !== mineId) {
          throw new ForbiddenError('Access denied to this mine');
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { authorize, PERMISSIONS, GLOBAL_ROLES };
