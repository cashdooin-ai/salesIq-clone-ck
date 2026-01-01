import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { requireAuth, requireAdmin, requireOrgAccess } from '../../middleware/index.js';

export async function organizationRoutes(fastify: FastifyInstance) {
  // Get organization (require auth and org access)
  fastify.get('/:id', { preHandler: [requireAuth, requireOrgAccess] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, visitors: true, conversations: true } },
      },
    });

    if (!org) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Organization not found' },
      });
    }

    return { success: true, data: org };
  });

  // Update organization (require admin role)
  fastify.put('/:id', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, domain, logo } = request.body as any;

    const org = await prisma.organization.update({
      where: { id },
      data: { name, domain, logo },
    });

    return { success: true, data: org };
  });

  // Get widget config (require auth)
  fastify.get('/:id/widget', { preHandler: [requireAuth, requireOrgAccess] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { widgetConfig: true },
    });

    return { success: true, data: org?.widgetConfig };
  });

  // Update widget config (require admin)
  fastify.put('/:id/widget', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const widgetConfig = request.body;

    const org = await prisma.organization.update({
      where: { id },
      data: { widgetConfig },
    });

    return { success: true, data: org.widgetConfig };
  });

  // Get API keys (require admin)
  fastify.get('/:id/api-keys', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: id },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: keys };
  });

  // Create API key (require admin)
  fastify.post('/:id/api-keys', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, permissions, expiresAt } = request.body as any;

    const { generateApiKey } = await import('@nexvo/shared');

    const apiKey = await prisma.apiKey.create({
      data: {
        organizationId: id,
        key: generateApiKey(),
        name: name || 'API Key',
        permissions: permissions || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return { success: true, data: apiKey };
  });

  // Update API key (require admin)
  fastify.put('/:id/api-keys/:keyId', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id, keyId } = request.params as { id: string; keyId: string };
    const { name, permissions, isActive, expiresAt } = request.body as any;

    const apiKey = await prisma.apiKey.update({
      where: {
        id: keyId,
        organizationId: id,
      },
      data: {
        ...(name && { name }),
        ...(permissions !== undefined && { permissions }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return { success: true, data: apiKey };
  });

  // Delete API key (require admin)
  fastify.delete('/:id/api-keys/:keyId', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id, keyId } = request.params as { id: string; keyId: string };

    await prisma.apiKey.delete({
      where: {
        id: keyId,
        organizationId: id,
      },
    });

    return { success: true, data: { message: 'API key deleted successfully' } };
  });

  // Get organization settings (require auth)
  fastify.get('/:id/settings', { preHandler: [requireAuth, requireOrgAccess] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { settings: true },
    });

    return { success: true, data: org?.settings };
  });

  // Update organization settings (require admin)
  fastify.put('/:id/settings', { preHandler: [requireAuth, requireOrgAccess, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const settings = request.body;

    const org = await prisma.organization.update({
      where: { id },
      data: { settings },
    });

    return { success: true, data: org.settings };
  });
}
