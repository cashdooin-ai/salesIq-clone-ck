// Nexvo API - Authentication Middleware
// JWT-based authentication for operator/admin endpoints

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { verifyAccessToken } from '../modules/auth/auth.utils.js';

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  // If no "Bearer" prefix, treat the whole header as token
  if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Authentication middleware - verifies JWT token
 * Attaches user and organization info to request
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractToken(request);

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required. Please provide a valid access token.',
        },
      });
    }

    // Verify JWT token
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch (error: any) {
      // Handle specific JWT errors
      const isExpired = error.name === 'TokenExpiredError';
      const isInvalid = error.name === 'JsonWebTokenError';

      request.log.warn(
        { error: error.message, tokenPrefix: token.substring(0, 10) },
        'Token verification failed'
      );

      return reply.status(401).send({
        success: false,
        error: {
          code: isExpired ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.TOKEN_INVALID,
          message: isExpired
            ? 'Access token has expired. Please refresh your token.'
            : 'Invalid access token. Please login again.',
        },
      });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    // Check if user exists
    if (!user) {
      request.log.warn({ userId: payload.userId }, 'User not found for valid token');

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User account not found. Please login again.',
        },
      });
    }

    // Check if user belongs to the correct organization
    if (user.organizationId !== payload.organizationId) {
      request.log.warn(
        {
          userId: user.id,
          tokenOrgId: payload.organizationId,
          userOrgId: user.organizationId,
        },
        'Organization mismatch in token'
      );

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid token. Please login again.',
        },
      });
    }

    // Attach user info to request
    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      status: user.status,
    };

    // Attach organization info to request
    request.organization = {
      id: user.organization.id,
      slug: user.organization.slug,
      name: user.organization.name,
      plan: user.organization.plan,
    };

    // Log successful authentication (debug level)
    request.log.debug(
      {
        userId: user.id,
        userRole: user.role,
        organizationId: user.organizationId,
      },
      'User authenticated successfully'
    );

    // Continue to route handler
  } catch (error) {
    // Catch any unexpected errors
    request.log.error({ error }, 'Authentication middleware error');

    return reply.status(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An error occurred during authentication.',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractToken(request);

    // If no token, just continue without user info
    if (!token) {
      return;
    }

    // Try to verify token
    let payload;
    try {
      payload = await verifyAccessToken(token);
    } catch {
      // If token is invalid, just continue without user info
      return;
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: {
          select: { id: true, slug: true, name: true, plan: true },
        },
      },
    });

    if (user && user.organizationId === payload.organizationId) {
      // Attach user and organization info
      request.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        status: user.status,
      };

      request.organization = {
        id: user.organization.id,
        slug: user.organization.slug,
        name: user.organization.name,
        plan: user.organization.plan,
      };
    }
  } catch (error) {
    // Silently ignore errors in optional auth
    request.log.debug({ error }, 'Optional auth failed');
  }
}
