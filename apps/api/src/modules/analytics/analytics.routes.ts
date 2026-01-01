import { FastifyInstance } from 'fastify';
import { analyticsService } from '../../services/analytics.js';
import { requireAuth } from '../../middleware/index.js';

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Dashboard overview stats
  fastify.get('/overview', { preHandler: requireAuth }, async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const stats = await analyticsService.getOverviewStats(
      request.user!.organizationId,
      dateRange
    );

    return { success: true, data: stats };
  });

  // Conversation metrics
  fastify.get('/conversations', { preHandler: requireAuth }, async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const metrics = await analyticsService.getConversationMetrics(
      request.user!.organizationId,
      dateRange
    );

    return { success: true, data: metrics };
  });

  // Visitor analytics
  fastify.get('/visitors', { preHandler: requireAuth }, async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const metrics = await analyticsService.getVisitorMetrics(
      request.user!.organizationId,
      dateRange
    );

    return { success: true, data: metrics };
  });

  // Operator performance metrics
  fastify.get('/operators', { preHandler: requireAuth }, async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    const metrics = await analyticsService.getOperatorMetrics(
      request.user!.organizationId,
      dateRange
    );

    return { success: true, data: metrics };
  });

  // Chatbot metrics (placeholder for future)
  fastify.get('/chatbots', { preHandler: requireAuth }, async (request, reply) => {
    const { startDate, endDate } = request.query as {
      startDate?: string;
      endDate?: string;
    };

    const dateRange = {
      start: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate) : new Date(),
    };

    // Placeholder - return empty metrics for now
    const metrics = {
      totalInteractions: 0,
      successRate: 0,
      avgHandoffTime: 0,
      topBots: [],
    };

    return { success: true, data: metrics };
  });
}
