import { FastifyInstance } from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { userRoutes } from '../modules/users/users.routes.js';
import { organizationRoutes } from '../modules/organizations/organizations.routes.js';
import { visitorRoutes } from '../modules/visitors/visitors.routes.js';
import { conversationRoutes } from '../modules/conversations/conversations.routes.js';
import { widgetRoutes } from '../modules/widget/widget.routes.js';
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

      // Widget (public API)
      await app.register(widgetRoutes, { prefix: '/widget' });
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
