// Nexvo API - API Key Authentication Middleware
// For widget and public API endpoints

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';

/**
 * Extract API key from request
 * Supports multiple sources:
 * 1. Header: x-api-key
 * 2. Header: authorization (as Bearer token)
 * 3. Query param: apiKey
 * 4. Body: apiKey
 */
function extractApiKey(request: FastifyRequest): string | null {
  // 1. Check x-api-key header
  const headerKey = request.headers['x-api-key'] as string;
  if (headerKey) {
    return headerKey;
  }

  // 2. Check authorization header (Bearer format)
  const authHeader = request.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // 3. Check query parameter
  const query = request.query as { apiKey?: string };
  if (query.apiKey) {
    return query.apiKey;
  }

  // 4. Check request body (for POST/PUT requests)
  const body = request.body as { apiKey?: string };
  if (body && body.apiKey) {
    return body.apiKey;
  }

  return null;
}

/**
 * API Key authentication middleware
 * Validates API key and attaches organization info to request
 */
export async function requireApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract API key
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'API key required. Please provide a valid API key.',
        },
      });
    }

    // Find API key in database
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true,
            plan: true,
            widgetConfig: true,
          },
        },
      },
    });

    // Check if API key exists
    if (!key) {
      request.log.warn(
        { apiKeyPrefix: apiKey.substring(0, 10) },
        'Invalid API key attempted'
      );

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid API key.',
        },
      });
    }

    // Check if API key is active
    if (!key.isActive) {
      request.log.warn(
        {
          apiKeyId: key.id,
          organizationId: key.organizationId,
        },
        'Inactive API key attempted'
      );

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'API key is inactive. Please contact support.',
        },
      });
    }

    // Check if API key is expired
    if (key.expiresAt && key.expiresAt < new Date()) {
      request.log.warn(
        {
          apiKeyId: key.id,
          organizationId: key.organizationId,
          expiresAt: key.expiresAt,
        },
        'Expired API key attempted'
      );

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'API key has expired. Please generate a new one.',
        },
      });
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey
      .update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        request.log.error({ error, apiKeyId: key.id }, 'Failed to update API key lastUsedAt');
      });

    // Attach API key info to request
    request.apiKey = {
      id: key.id,
      key: key.key,
      organizationId: key.organizationId,
    };

    // Attach organization info to request
    request.organization = {
      id: key.organization.id,
      slug: key.organization.slug,
      name: key.organization.name,
      plan: key.organization.plan,
    };

    // Log successful authentication (debug level)
    request.log.debug(
      {
        apiKeyId: key.id,
        organizationId: key.organizationId,
      },
      'API key validated successfully'
    );

    // Continue to route handler
  } catch (error) {
    // Catch any unexpected errors
    request.log.error({ error }, 'API key middleware error');

    return reply.status(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An error occurred during API key validation.',
      },
    });
  }
}

/**
 * Optional API key middleware
 * Validates API key if present, but doesn't require it
 */
export async function optionalApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const apiKey = extractApiKey(request);

    // If no API key, just continue
    if (!apiKey) {
      return;
    }

    // Try to validate API key
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        organization: {
          select: { id: true, slug: true, name: true, plan: true },
        },
      },
    });

    // If valid and active, attach to request
    if (key && key.isActive && (!key.expiresAt || key.expiresAt >= new Date())) {
      request.apiKey = {
        id: key.id,
        key: key.key,
        organizationId: key.organizationId,
      };

      request.organization = {
        id: key.organization.id,
        slug: key.organization.slug,
        name: key.organization.name,
        plan: key.organization.plan,
      };

      // Update last used timestamp
      prisma.apiKey
        .update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((error) => {
          request.log.error({ error, apiKeyId: key.id }, 'Failed to update API key lastUsedAt');
        });
    }
  } catch (error) {
    // Silently ignore errors in optional API key auth
    request.log.debug({ error }, 'Optional API key auth failed');
  }
}

/**
 * Check API key permissions
 * Validates that the API key has specific permissions
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check if API key is authenticated
    if (!request.apiKey) {
      request.log.warn('requirePermission called but no API key in request');

      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'API key authentication required.',
        },
      });
    }

    // Fetch full API key with permissions
    const key = await prisma.apiKey.findUnique({
      where: { id: request.apiKey.id },
      select: { permissions: true },
    });

    if (!key) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Invalid API key.',
        },
      });
    }

    // Check if API key has the required permission
    // Empty permissions array means full access
    if (key.permissions.length > 0 && !key.permissions.includes(permission)) {
      request.log.warn(
        {
          apiKeyId: request.apiKey.id,
          requiredPermission: permission,
          keyPermissions: key.permissions,
        },
        'Access forbidden - missing permission'
      );

      return reply.status(403).send({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: `Access denied. Required permission: ${permission}.`,
        },
      });
    }

    // API key has required permission, continue
  };
}
