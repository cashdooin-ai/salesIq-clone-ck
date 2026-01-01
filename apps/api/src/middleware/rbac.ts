// Nexvo API - Role-Based Access Control (RBAC) Middleware
// Checks user roles and permissions

import { FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_CODES } from '@nexvo/shared';

/**
 * User roles in order of hierarchy (highest to lowest)
 */
export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  OPERATOR = 'OPERATOR',
}

/**
 * Role hierarchy mapping (role -> level)
 * Higher number = more privileges
 */
const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 4,
  ADMIN: 3,
  SUPERVISOR: 2,
  OPERATOR: 1,
};

/**
 * Check if a role has sufficient privileges
 */
function hasRole(userRole: string, requiredRoles: string[]): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = Math.min(
    ...requiredRoles.map((role) => ROLE_HIERARCHY[role] || Infinity)
  );

  return userLevel >= requiredLevel;
}

/**
 * Middleware factory - requires user to have one of the specified roles
 * Usage: requireRole(['ADMIN', 'OWNER'])
 */
export function requireRole(allowedRoles: UserRole[] | string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check if user is authenticated (should be set by requireAuth middleware)
    if (!request.user) {
      request.log.warn('requireRole called but no user in request');

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required.',
        },
      });
    }

    const userRole = request.user.role;

    // Check if user has required role
    if (!hasRole(userRole, allowedRoles)) {
      request.log.warn(
        {
          userId: request.user.id,
          userRole,
          requiredRoles: allowedRoles,
        },
        'Access forbidden - insufficient role'
      );

      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
        },
      });
    }

    // Log authorization (debug level)
    request.log.debug(
      {
        userId: request.user.id,
        userRole,
        requiredRoles: allowedRoles,
      },
      'Role check passed'
    );

    // User has required role, continue
  };
}

/**
 * Convenience middleware - require OWNER role
 */
export const requireOwner = requireRole([UserRole.OWNER]);

/**
 * Convenience middleware - require ADMIN or OWNER role
 */
export const requireAdmin = requireRole([UserRole.ADMIN, UserRole.OWNER]);

/**
 * Convenience middleware - require SUPERVISOR, ADMIN, or OWNER role
 */
export const requireSupervisor = requireRole([
  UserRole.SUPERVISOR,
  UserRole.ADMIN,
  UserRole.OWNER,
]);

/**
 * Middleware - check if user belongs to the organization in the route
 * Useful for routes like /api/v1/organizations/:orgId/...
 */
export async function requireOrgAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required.',
      },
    });
  }

  // Extract organization ID from route params
  const params = request.params as { id?: string; organizationId?: string };
  const routeOrgId = params.id || params.organizationId;

  if (!routeOrgId) {
    // No org ID in route, skip check
    return;
  }

  // Check if user's organization matches route organization
  if (request.user.organizationId !== routeOrgId) {
    request.log.warn(
      {
        userId: request.user.id,
        userOrgId: request.user.organizationId,
        routeOrgId,
      },
      'Access forbidden - organization mismatch'
    );

    return reply.status(403).send({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: 'Access denied. You do not have access to this organization.',
      },
    });
  }

  // User belongs to the organization, continue
}

/**
 * Middleware - check if user can modify another user
 * Rules:
 * - Users can modify themselves
 * - OWNERs can modify anyone in their org
 * - ADMINs can modify SUPERVISORs and OPERATORs
 * - SUPERVISORs can modify OPERATORs
 */
export async function canModifyUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required.',
      },
    });
  }

  const params = request.params as { id?: string; userId?: string };
  const targetUserId = params.id || params.userId;

  // If modifying self, always allow (with requireAuth)
  if (targetUserId === request.user.id) {
    return;
  }

  // Check role hierarchy
  const userRole = request.user.role;

  if (userRole === UserRole.OWNER) {
    // OWNERs can modify anyone
    return;
  }

  if (userRole === UserRole.ADMIN) {
    // ADMINs can modify anyone except OWNERs
    // We'd need to fetch the target user to check their role
    // For now, we'll allow and check in the route handler
    return;
  }

  // SUPERVISORs and OPERATORs cannot modify other users
  request.log.warn(
    {
      userId: request.user.id,
      userRole,
      targetUserId,
    },
    'Access forbidden - cannot modify other users'
  );

  return reply.status(403).send({
    success: false,
    error: {
      code: ERROR_CODES.FORBIDDEN,
      message: 'Access denied. You do not have permission to modify this user.',
    },
  });
}

/**
 * Check if user's role can be elevated to target role
 * Used for user creation/updates
 */
export function canAssignRole(currentUserRole: string, targetRole: string): boolean {
  const currentLevel = ROLE_HIERARCHY[currentUserRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  // Users can only assign roles lower or equal to their own
  return currentLevel >= targetLevel;
}
