import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';

export async function userRoutes(fastify: FastifyInstance) {
  // List users
  fastify.get('/', async (request, reply) => {
    // TODO: Add authentication middleware
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return { success: true, data: users };
  });

  // Get user by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        status: true,
        settings: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return { success: true, data: user };
  });

  // Update user status
  fastify.put('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const user = await prisma.user.update({
      where: { id },
      data: { status: status as any, lastSeenAt: new Date() },
      select: { id: true, status: true },
    });

    return { success: true, data: user };
  });
}
