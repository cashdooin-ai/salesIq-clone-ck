import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';

export async function organizationRoutes(fastify: FastifyInstance) {
  // Get organization
  fastify.get('/:id', async (request, reply) => {
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
        error: { code: 'NOT_FOUND', message: 'Organization not found' },
      });
    }

    return { success: true, data: org };
  });

  // Update organization
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, domain, logo } = request.body as any;

    const org = await prisma.organization.update({
      where: { id },
      data: { name, domain, logo },
    });

    return { success: true, data: org };
  });

  // Get widget config
  fastify.get('/:id/widget', async (request, reply) => {
    const { id } = request.params as { id: string };

    const org = await prisma.organization.findUnique({
      where: { id },
      select: { widgetConfig: true },
    });

    return { success: true, data: org?.widgetConfig };
  });

  // Update widget config
  fastify.put('/:id/widget', async (request, reply) => {
    const { id } = request.params as { id: string };
    const widgetConfig = request.body;

    const org = await prisma.organization.update({
      where: { id },
      data: { widgetConfig },
    });

    return { success: true, data: org.widgetConfig };
  });
}
