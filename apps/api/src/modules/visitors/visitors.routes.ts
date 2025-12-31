import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';

export async function visitorRoutes(fastify: FastifyInstance) {
  // List visitors
  fastify.get('/', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as any;

    const visitors = await prisma.visitor.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { lastSeenAt: 'desc' },
      include: {
        _count: { select: { conversations: true, sessions: true } },
      },
    });

    const total = await prisma.visitor.count();

    return {
      success: true,
      data: visitors,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Get online visitors
  fastify.get('/online', async (request, reply) => {
    // Online = lastSeenAt within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const visitors = await prisma.visitor.findMany({
      where: { lastSeenAt: { gte: fiveMinutesAgo } },
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

  // Get visitor by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      include: {
        sessions: { orderBy: { startedAt: 'desc' }, take: 10 },
        conversations: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!visitor) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Visitor not found' },
      });
    }

    return { success: true, data: visitor };
  });

  // Update visitor
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, phone, tags, metadata } = request.body as any;

    const visitor = await prisma.visitor.update({
      where: { id },
      data: { name, email, phone, tags, metadata },
    });

    return { success: true, data: visitor };
  });
}
