import { FastifyInstance } from 'fastify';
import { prisma } from '@nexvo/database';
import { generateVisitorToken, parseUserAgent, ERROR_CODES } from '@nexvo/shared';
import { requireApiKey } from '../../middleware/index.js';
import { storageService } from '../../services/storage.js';
import { widgetUploadSchema } from '../uploads/uploads.validation.js';
import { UploadFolder } from '../../lib/upload.js';

export async function widgetRoutes(fastify: FastifyInstance) {
  // Initialize widget session (require API key)
  fastify.post('/init', { preHandler: requireApiKey }, async (request, reply) => {
    const { visitorToken, url, referrer, userAgent } = request.body as any;

    // Organization is already attached by requireApiKey middleware
    const organizationId = request.organization!.id;

    // Get widget config
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { widgetConfig: true },
    });

    // Parse user agent
    const ua = parseUserAgent(userAgent || request.headers['user-agent'] || '');

    // Find or create visitor
    let visitor = visitorToken
      ? await prisma.visitor.findUnique({
          where: {
            visitorToken,
            organizationId,
          },
        })
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
        config: org?.widgetConfig || {},
      },
    };
  });

  // Track page view (require API key)
  fastify.post('/track', { preHandler: requireApiKey }, async (request, reply) => {
    const { sessionId, url, title } = request.body as any;

    // Verify session belongs to organization
    const session = await prisma.visitorSession.findUnique({
      where: { id: sessionId },
      include: { visitor: { select: { organizationId: true } } },
    });

    if (!session || session.visitor.organizationId !== request.organization!.id) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Invalid session' },
      });
    }

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

  // Start conversation (require API key)
  fastify.post('/conversation', { preHandler: requireApiKey }, async (request, reply) => {
    const { visitorId, message, preChatData } = request.body as any;

    // Verify visitor belongs to organization
    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId },
      select: { organizationId: true },
    });

    if (!visitor || visitor.organizationId !== request.organization!.id) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Invalid visitor' },
      });
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        organizationId: request.organization!.id,
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

  // Send message from widget (require API key)
  fastify.post('/message', { preHandler: requireApiKey }, async (request, reply) => {
    const { conversationId, visitorId, content, contentType = 'TEXT' } = request.body as any;

    // Verify conversation and visitor belong to organization
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { organizationId: true, visitorId: true },
    });

    if (!conversation || conversation.organizationId !== request.organization!.id) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Invalid conversation' },
      });
    }

    if (conversation.visitorId !== visitorId) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Visitor mismatch' },
      });
    }

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

  // Get messages for conversation (require API key)
  fastify.get('/messages', { preHandler: requireApiKey }, async (request, reply) => {
    const { conversationId, after } = request.query as any;

    // Verify conversation belongs to organization
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { organizationId: true },
    });

    if (!conversation || conversation.organizationId !== request.organization!.id) {
      return reply.status(403).send({
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Invalid conversation' },
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return { success: true, data: messages };
  });

  // Upload file from widget (visitor file upload) - require API key
  fastify.post('/upload', { preHandler: requireApiKey }, async (request, reply) => {
    try {
      // Get multipart file
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'No file uploaded',
          },
        });
      }

      // Get file buffer
      const buffer = await data.toBuffer();

      // Validate file with stricter widget limits (5MB max)
      const validation = widgetUploadSchema.safeParse({
        mimeType: data.mimetype,
        size: buffer.length,
      });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.VALIDATION_ERROR,
            message: validation.error.errors[0].message,
            details: validation.error.errors,
          },
        });
      }

      // Get visitor from request body
      const { visitorId } = request.body as any;

      if (!visitorId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_INPUT,
            message: 'visitorId is required',
          },
        });
      }

      // Verify visitor exists and belongs to organization
      const visitor = await prisma.visitor.findFirst({
        where: {
          id: visitorId,
          organizationId: request.organization!.id,
        },
      });

      if (!visitor) {
        return reply.status(404).send({
          success: false,
          error: {
            code: ERROR_CODES.NOT_FOUND,
            message: 'Visitor not found',
          },
        });
      }

      // Upload to storage
      const { url, filename } = await storageService.uploadFromBuffer(
        buffer,
        UploadFolder.WIDGET,
        data.filename,
        data.mimetype
      );

      // Save upload record
      const upload = await prisma.upload.create({
        data: {
          organizationId: request.organization!.id,
          userId: null, // Widget uploads don't have a user
          filename,
          originalName: data.filename,
          mimeType: data.mimetype,
          size: buffer.length,
          url,
          folder: UploadFolder.WIDGET,
        },
      });

      return {
        success: true,
        data: {
          id: upload.id,
          url: upload.url,
          filename: upload.filename,
          originalName: upload.originalName,
          size: upload.size,
          mimeType: upload.mimeType,
        },
      };
    } catch (error: any) {
      fastify.log.error('Widget upload error:', error);

      return reply.status(500).send({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to upload file',
        },
      });
    }
  });
}
