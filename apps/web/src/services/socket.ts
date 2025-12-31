import { io, Socket } from 'socket.io-client';
import type { Conversation, Message, Visitor, TypingIndicator } from '@/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string, organizationId: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${SOCKET_URL}/operator`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupListeners(organizationId);
  }

  private setupListeners(organizationId: string) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Join organization room
      this.socket?.emit('join:organization', organizationId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Conversation events
  onNewConversation(callback: (conversation: Conversation) => void) {
    this.socket?.on('conversation:new', callback);
  }

  onConversationUpdate(callback: (conversation: Conversation) => void) {
    this.socket?.on('conversation:update', callback);
  }

  onConversationAssigned(callback: (data: { conversationId: string; operatorId: string }) => void) {
    this.socket?.on('conversation:assigned', callback);
  }

  // Message events
  onNewMessage(callback: (message: Message) => void) {
    this.socket?.on('message:new', callback);
  }

  onMessageRead(callback: (data: { conversationId: string; messageIds: string[] }) => void) {
    this.socket?.on('message:read', callback);
  }

  sendMessage(conversationId: string, content: string, type = 'text') {
    this.socket?.emit('message:send', {
      conversationId,
      content,
      type,
    });
  }

  // Typing events
  onTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.on('typing:start', callback);
  }

  onStopTyping(callback: (data: TypingIndicator) => void) {
    this.socket?.on('typing:stop', callback);
  }

  sendTyping(conversationId: string) {
    this.socket?.emit('typing:start', { conversationId });
  }

  sendStopTyping(conversationId: string) {
    this.socket?.emit('typing:stop', { conversationId });
  }

  // Visitor events
  onVisitorOnline(callback: (visitor: Visitor) => void) {
    this.socket?.on('visitor:online', callback);
  }

  onVisitorOffline(callback: (visitorId: string) => void) {
    this.socket?.on('visitor:offline', callback);
  }

  onVisitorUpdate(callback: (visitor: Visitor) => void) {
    this.socket?.on('visitor:update', callback);
  }

  // Operator status
  updateStatus(status: 'online' | 'away' | 'busy') {
    this.socket?.emit('operator:status', { status });
  }

  onOperatorStatusChange(callback: (data: { operatorId: string; status: string }) => void) {
    this.socket?.on('operator:status:change', callback);
  }

  // Join/leave conversation
  joinConversation(conversationId: string) {
    this.socket?.emit('conversation:join', conversationId);
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation:leave', conversationId);
  }

  // Remove listeners
  removeListener(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
export default socketService;
