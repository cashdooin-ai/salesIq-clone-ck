import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { config } from './config/index.js';
import { setupRoutes } from './routes/index.js';
import { setupSocket } from './socket/index.js';
import { prisma } from '@nexvo/database';
import { redis } from './lib/redis.js';

async function main() {
  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.isDev
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // Create HTTP server for Socket.IO
  const httpServer = createServer(fastify.server);

  // Setup Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  // Attach io to fastify instance
  fastify.decorate('io', io);

  // Register plugins
  await fastify.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: config.isDev ? false : undefined,
  });

  await fastify.register(cookie, {
    secret: config.jwtSecret,
  });

  await fastify.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.windowMs,
  });

  // Register multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB default max file size
      files: 5, // Max 5 files per request
      fields: 10, // Max 10 non-file fields
    },
  });

  // Setup routes
  await setupRoutes(fastify);

  // Setup Socket.IO handlers
  setupSocket(io);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down...');
    await fastify.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Start server
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    fastify.log.info(`🚀 Server running at http://localhost:${config.port}`);
    fastify.log.info(`📡 WebSocket server ready`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
