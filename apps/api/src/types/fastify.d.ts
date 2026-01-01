// Nexvo API - Fastify Type Extensions
// Adds authentication context to Fastify requests

import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    // User authentication info (from JWT)
    user?: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      status: string;
    };

    // Organization info (from JWT or API key)
    organization?: {
      id: string;
      slug: string;
      name: string;
      plan: string;
    };

    // API Key info (for widget/public endpoints)
    apiKey?: {
      id: string;
      key: string;
      organizationId: string;
    };
  }
}
