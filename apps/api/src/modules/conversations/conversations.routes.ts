import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { ERROR_CODES } from '@nexvo/shared';
import { requireAuth } from '../../middleware/index.js';

export async function conversationRoutes(fastify: FastifyInstance) {
  // List conversations (require auth, filter by organization)
  fastify.get('/', { preHandler: requireAuth }, async (request, reply) => {
    const { status, page = 1, limit = 20 } = request.query as any;

    const where = {
      organizationId: request.user!.organizationId,
      ...(status && { status }),
    };

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

  // Get conversation by ID (require auth, same organization)
  fastify.get('/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const conversation = await prisma.conversation.findUnique({
      where: {
        id,
        organizationId: request.user!.organizationId,
      },
      include: {
        visitor: true,
        operator: { select: { id: true, name: true, avatar: true, status: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!conversation) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Conversation not found' },
      });
    }

    return { success: true, data: conversation };
  });

  // Get messages (require auth)
  fastify.get('/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { before, limit = 50 } = request.query as any;

    // Verify conversation belongs to user's organization
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!conversation) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Conversation not found' },
      });
    }

    if (conversation.organizationId !== request.user!.organizationId) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
      });
    }

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

  // Send message (require auth)
  fastify.post('/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content, contentType = 'TEXT', attachments = [] } = request.body as any;

    // Verify conversation belongs to user's organization
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true, firstResponseAt: true },
    });

    if (!conversation) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Conversation not found' },
      });
    }

    if (conversation.organizationId !== request.user!.organizationId) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
      });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        content,
        contentType,
        senderId: request.user!.id,
        senderType: 'OPERATOR',
        attachments: attachments,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        status: 'ACTIVE',
        ...(!conversation.firstResponseAt ? { firstResponseAt: new Date() } : {}),
      },
    });

    // TODO: Emit socket event
    // fastify.io.to(`conversation:${id}`).emit('message:new', message);

    return { success: true, data: message };
  });

  // Assign operator (require auth)
  fastify.post('/:id/assign', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { operatorId } = request.body as { operatorId: string };

    // Verify conversation belongs to user's organization
    const conv = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!conv) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Conversation not found' },
      });
    }

    if (conv.organizationId !== request.user!.organizationId) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
      });
    }

    // Verify operator belongs to same organization
    const operator = await prisma.user.findUnique({
      where: { id: operatorId },
      select: { organizationId: true },
    });

    if (!operator || operator.organizationId !== request.user!.organizationId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_INPUT,
          message: 'Invalid operator',
        },
      });
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { operatorId, status: 'ACTIVE' },
      include: { operator: { select: { id: true, name: true, avatar: true } } },
    });

    return { success: true, data: conversation };
  });

  // Close conversation (require auth)
  fastify.post('/:id/close', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { rating, feedback } = request.body as any;

    // Verify conversation belongs to user's organization
    const conv = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true },
    });

    if (!conv) {
      return reply.status(404).send({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Conversation not found' },
      });
    }

    if (conv.organizationId !== request.user!.organizationId) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Access denied' },
      });
    }

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
