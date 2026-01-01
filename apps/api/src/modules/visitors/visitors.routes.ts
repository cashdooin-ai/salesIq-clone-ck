import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { requireAuth } from '../../middleware/index.js';

export async function visitorRoutes(fastify: FastifyInstance) {
  // List visitors (require auth, filter by organization)
  fastify.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as any;

    const visitors = await prisma.visitor.findMany({
      where: {
        organizationId: request.user!.organizationId,
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { lastSeenAt: 'desc' },
      include: {
        _count: { select: { conversations: true, sessions: true } },
      },
    });

    const total = await prisma.visitor.count({
      where: {
        organizationId: request.user!.organizationId,
      },
    });

    return {
      success: true,
      data: visitors,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Get online visitors (require auth, filter by organization)
  fastify.get('/online', { preHandler: requireAuth }, async (request, reply) => {
    // Online = lastSeenAt within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const visitors = await prisma.visitor.findMany({
      where: {
        organizationId: request.user!.organizationId,
        lastSeenAt: { gte: fiveMinutesAgo },
      },
      orderBy: { lastSeenAt: 'desc' },
      include: {
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          include: { pageViews: { orderBy: { enteredAt: 'desc' }, take: 1 } },
        },
      },
    });

    return { success: true, data: visitors };
  });

  // Get visitor by ID (require auth, same organization)
  fastify.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const visitor = await prisma.visitor.findUnique({
      where: {
        id,
        organizationId: request.user!.organizationId,
      },
      include: {
        sessions: { orderBy: { startedAt: 'desc' }, take: 10 },
        conversations: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!visitor) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Visitor not found' },
      });
    }

    return { success: true, data: visitor };
  });

  // Update visitor (require auth, same organization)
  fastify.put('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, phone, tags, metadata } = request.body as any;

    const visitor = await prisma.visitor.update({
      where: {
        id,
        organizationId: request.user!.organizationId,
      },
      data: { name, email, phone, tags, metadata },
    });

    return { success: true, data: visitor };
  });
}
