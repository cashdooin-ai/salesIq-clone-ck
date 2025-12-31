import { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@nexvo/shared';
import { redis } from '../lib/redis.js';

interface OperatorSocket extends Socket {
  userId?: string;
  organizationId?: string;
}

interface WidgetSocket extends Socket {
  visitorId?: string;
  organizationId?: string;
}

export function setupSocket(io: Server) {
  // Operator namespace
  const operatorNs = io.of('/operator');

  operatorNs.on('connection', (socket: OperatorSocket) => {
    console.log(`Operator connected: ${socket.id}`);

    // Join organization room
    socket.on(WS_EVENTS.OPERATOR_JOIN, async (data: { organizationId: string; userId: string }) => {
      socket.organizationId = data.organizationId;
      socket.userId = data.userId;

      await socket.join(`org:${data.organizationId}`);
      await redis.sadd(`online:operators:${data.organizationId}`, data.userId);

      console.log(`Operator ${data.userId} joined org ${data.organizationId}`);
    });

    // Update status
    socket.on(WS_EVENTS.OPERATOR_STATUS, async (status: string) => {
      if (socket.organizationId && socket.userId) {
        socket.to(`org:${socket.organizationId}`).emit(WS_EVENTS.OPERATOR_STATUS, {
          operatorId: socket.userId,
          status,
        });
      }
    });

    // Join conversation
    socket.on(WS_EVENTS.CONVERSATION_JOIN, (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Operator joined conversation ${conversationId}`);
    });

    // Leave conversation
    socket.on(WS_EVENTS.CONVERSATION_LEAVE, (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Send message
    socket.on(WS_EVENTS.MESSAGE_SEND, (data: { conversationId: string; content: string }) => {
      // Emit to all in conversation room
      io.of('/widget')
        .to(`conversation:${data.conversationId}`)
        .emit(WS_EVENTS.MESSAGE_NEW, {
          conversationId: data.conversationId,
          content: data.content,
          senderType: 'OPERATOR',
          senderId: socket.userId,
          createdAt: new Date().toISOString(),
        });
    });

    // Typing indicator
    socket.on(WS_EVENTS.MESSAGE_TYPING, (data: { conversationId: string; isTyping: boolean }) => {
      io.of('/widget')
        .to(`conversation:${data.conversationId}`)
        .emit(WS_EVENTS.MESSAGE_TYPING, {
          conversationId: data.conversationId,
          isTyping: data.isTyping,
          senderType: 'OPERATOR',
        });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (socket.organizationId && socket.userId) {
        await redis.srem(`online:operators:${socket.organizationId}`, socket.userId);

        socket.to(`org:${socket.organizationId}`).emit(WS_EVENTS.OPERATOR_STATUS, {
          operatorId: socket.userId,
          status: 'OFFLINE',
        });
      }
      console.log(`Operator disconnected: ${socket.id}`);
    });
  });

  // Widget namespace
  const widgetNs = io.of('/widget');

  widgetNs.on('connection', (socket: WidgetSocket) => {
    console.log(`Widget connected: ${socket.id}`);

    // Initialize visitor
    socket.on(WS_EVENTS.VISITOR_INIT, async (data: { visitorId: string; organizationId: string }) => {
      socket.visitorId = data.visitorId;
      socket.organizationId = data.organizationId;

      await socket.join(`visitor:${data.visitorId}`);
      await redis.sadd(`online:visitors:${data.organizationId}`, data.visitorId);

      // Notify operators
      operatorNs.to(`org:${data.organizationId}`).emit(WS_EVENTS.VISITOR_ONLINE, {
        visitorId: data.visitorId,
      });

      console.log(`Visitor ${data.visitorId} connected`);
    });

    // Track page view
    socket.on(WS_EVENTS.VISITOR_PAGEVIEW, (data: { url: string; title?: string }) => {
      if (socket.organizationId && socket.visitorId) {
        operatorNs.to(`org:${socket.organizationId}`).emit(WS_EVENTS.VISITOR_PAGEVIEW, {
          visitorId: socket.visitorId,
          url: data.url,
          title: data.title,
        });
      }
    });

    // Start conversation
    socket.on('conversation:start', (data: { conversationId: string }) => {
      socket.join(`conversation:${data.conversationId}`);

      // Notify operators
      if (socket.organizationId) {
        operatorNs.to(`org:${socket.organizationId}`).emit(WS_EVENTS.CONVERSATION_NEW, {
          conversationId: data.conversationId,
          visitorId: socket.visitorId,
        });
      }
    });

    // Send message
    socket.on(WS_EVENTS.MESSAGE_SEND, (data: { conversationId: string; content: string }) => {
      // Emit to operators
      operatorNs.to(`conversation:${data.conversationId}`).emit(WS_EVENTS.MESSAGE_NEW, {
        conversationId: data.conversationId,
        content: data.content,
        senderType: 'VISITOR',
        senderId: socket.visitorId,
        createdAt: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on(WS_EVENTS.MESSAGE_TYPING, (data: { conversationId: string; isTyping: boolean }) => {
      operatorNs.to(`conversation:${data.conversationId}`).emit(WS_EVENTS.MESSAGE_TYPING, {
        conversationId: data.conversationId,
        isTyping: data.isTyping,
        senderType: 'VISITOR',
      });
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (socket.organizationId && socket.visitorId) {
        await redis.srem(`online:visitors:${socket.organizationId}`, socket.visitorId);

        operatorNs.to(`org:${socket.organizationId}`).emit(WS_EVENTS.VISITOR_OFFLINE, {
          visitorId: socket.visitorId,
        });
      }
      console.log(`Widget disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.IO handlers configured');
}
