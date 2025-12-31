import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { generateVisitorToken, parseUserAgent } from '@nexvo/shared';

export async function widgetRoutes(fastify: FastifyInstance) {
  // Initialize widget session
  fastify.post('/init', async (request, reply) => {
    const { apiKey, visitorToken, url, referrer, userAgent } = request.body as any;

    // Validate API key
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { organization: { select: { id: true, widgetConfig: true } } },
    });

    if (!key || !key.isActive) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
      });
    }

    // Update last used
    await prisma.apiKey.update({
      where: { key: apiKey },
      data: { lastUsedAt: new Date() },
    });

    const organizationId = key.organizationId;

    // Parse user agent
    const ua = parseUserAgent(userAgent || request.headers['user-agent'] || '');

    // Find or create visitor
    let visitor = visitorToken
      ? await prisma.visitor.findUnique({ where: { visitorToken } })
      : null;

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          organizationId,
          visitorToken: generateVisitorToken(),
          score: 1,
        },
      });
    } else {
      // Update last seen
      await prisma.visitor.update({
        where: { id: visitor.id },
        data: { lastSeenAt: new Date(), score: { increment: 1 } },
      });
    }

    // Create session
    const session = await prisma.visitorSession.create({
      data: {
        visitorId: visitor.id,
        ipAddress: request.ip,
        userAgent: userAgent || request.headers['user-agent'],
        referrer,
        landingPage: url,
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
      },
    });

    // Track page view
    if (url) {
      await prisma.pageView.create({
        data: {
          sessionId: session.id,
          url,
        },
      });
    }

    return {
      success: true,
      data: {
        visitorToken: visitor.visitorToken,
        visitorId: visitor.id,
        sessionId: session.id,
        config: key.organization.widgetConfig,
      },
    };
  });

  // Track page view
  fastify.post('/track', async (request, reply) => {
    const { sessionId, url, title } = request.body as any;

    // Update previous page exit time
    await prisma.pageView.updateMany({
      where: { sessionId, exitedAt: null },
      data: { exitedAt: new Date() },
    });

    // Create new page view
    const pageView = await prisma.pageView.create({
      data: { sessionId, url, title },
    });

    return { success: true, data: pageView };
  });

  // Start conversation
  fastify.post('/conversation', async (request, reply) => {
    const { visitorId, organizationId, message, preChatData } = request.body as any;

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        organizationId,
        visitorId,
        status: 'PENDING',
        metadata: preChatData || {},
      },
    });

    // Create first message if provided
    if (message) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          content: message,
          senderType: 'VISITOR',
          senderId: visitorId,
        },
      });
    }

    // TODO: Emit socket event for new conversation

    return { success: true, data: conversation };
  });

  // Send message from widget
  fastify.post('/message', async (request, reply) => {
    const { conversationId, visitorId, content, contentType = 'TEXT' } = request.body as any;

    const message = await prisma.message.create({
      data: {
        conversationId,
        content,
        contentType,
        senderType: 'VISITOR',
        senderId: visitorId,
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return { success: true, data: message };
  });

  // Get messages for conversation
  fastify.get('/messages', async (request, reply) => {
    const { conversationId, after } = request.query as any;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: messages };
  });
}
