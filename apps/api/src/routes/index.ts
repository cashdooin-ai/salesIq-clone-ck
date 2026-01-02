import { FastifyInstance } from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/users.routes.js';
import { organizationRoutes } from '../modules/organizations/organizations.routes.js';
import { visitorRoutes } from '../modules/visitors/visitors.routes.js';
import { conversationRoutes } from '../modules/conversations/conversations.routes.js';
import { widgetRoutes } from '../modules/widget/widget.routes.js';
import { uploadRoutes } from '../modules/uploads/uploads.routes.js';
import { analyticsRoutes } from '../modules/analytics/analytics.routes.js';
import { billingRoutes } from '../modules/billing/billing.routes.js';
import { webhookRoutes } from '../modules/webhooks/webhooks.routes.js';
import { devRoutes } from '../modules/dev/dev.routes.js';
import { API_PREFIX } from '@nexvo/shared';

export async function setupRoutes(fastify: FastifyInstance) {
  // API routes
  await fastify.register(
    async (app) => {
      // Auth
      await app.register(authRoutes, { prefix: '/auth' });

      // Users
      await app.register(userRoutes, { prefix: '/users' });

      // Organizations
      await app.register(organizationRoutes, { prefix: '/organizations' });

      // Visitors
      await app.register(visitorRoutes, { prefix: '/visitors' });

      // Conversations
      await app.register(conversationRoutes, { prefix: '/conversations' });

      // Uploads
      await app.register(uploadRoutes, { prefix: '/uploads' });

      // Analytics
      await app.register(analyticsRoutes, { prefix: '/analytics' });

      // Billing
      await app.register(billingRoutes, { prefix: '/billing' });

      // Widget (public API)
      await app.register(widgetRoutes, { prefix: '/widget' });

      // Webhooks (public API for payment gateways)
      await app.register(webhookRoutes, { prefix: '/webhooks' });

      // Development tools (dev only)
      await app.register(devRoutes, { prefix: '/dev' });
    },
    { prefix: API_PREFIX }
  );

  // API docs info
  fastify.get('/api', async () => {
    return {
      name: 'Nexvo API',
      version: '1.0.0',
      docs: '/api/docs',
    };
  });
}
