import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';

export async function conversationRoutes(fastify: FastifyInstance) {
  // List conversations
  fastify.get('/', async (request, reply) => {
    const { status, page = 1, limit = 20 } = request.query as any;

    const where = status ? { status } : {};

    const conversations = await prisma.conversation.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        visitor: { select: { id: true, name: true, email: true, avatar: true } },
        operator: { select: { id: true, name: true, avatar: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const total = await prisma.conversation.count({ where });

    return {
      success: true,
      data: conversations,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  // Get conversation by ID
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        visitor: true,
        operator: { select: { id: true, name: true, avatar: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Conversation not found' },
      });
    }

    return { success: true, data: conversation };
  });

  // Get messages
  fastify.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { before, limit = 50 } = request.query as any;

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, data: messages.reverse() };
  });

  // Send message
  fastify.post('/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content, contentType = 'TEXT', senderId, senderType } = request.body as any;

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        content,
        contentType,
        senderId,
        senderType,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: senderType === 'OPERATOR' ? 'ACTIVE' : 'WAITING',
        ...(senderType === 'OPERATOR' && !message.id ? { firstResponseAt: new Date() } : {}),
      },
    });

    // TODO: Emit socket event
    // fastify.io.to(`conversation:${id}`).emit('message:new', message);

    return { success: true, data: message };
  });

  // Assign operator
  fastify.post('/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { operatorId } = request.body as { operatorId: string };

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { operatorId, status: 'ACTIVE' },
      include: { operator: { select: { id: true, name: true, avatar: true } } },
    });

    return { success: true, data: conversation };
  });

  // Close conversation
  fastify.post('/:id/close', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rating, feedback } = request.body as any;

    const conversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        closedAt: new Date(),
        rating,
        feedback,
      },
    });

    return { success: true, data: conversation };
  });
}
