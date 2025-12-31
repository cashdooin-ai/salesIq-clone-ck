import { io, Socket } from 'socket.io-client';
import { WidgetConfig, Message, TypingStatus, OperatorStatus, ChatSession } from '../types';

type EventHandler = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private config: WidgetConfig;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();

  constructor(config: WidgetConfig) {
    this.config = config;
  }

  connect(visitorId: string, sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.wsUrl || 'wss://api.nexvo.io';

      this.socket = io(`${wsUrl}/widget`, {
        auth: {
          apiKey: this.config.apiKey,
          visitorId,
          sessionId,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Nexvo Widget] Socket connected');
        this.emit('visitor:init', {
          visitorId,
          sessionId,
          apiKey: this.config.apiKey,
        });
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Nexvo Widget] Socket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Nexvo Widget] Socket disconnected:', reason);
        this.trigger('disconnect', reason);
      });

      // Set up event listeners
      this.setupEventListeners();
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('message:new', (message: Message) => {
      this.trigger('message:new', message);
    });

    this.socket.on('operator:typing', (data: TypingStatus) => {
      this.trigger('operator:typing', data);
    });

    this.socket.on('operator:status', (status: OperatorStatus) => {
      this.trigger('operator:status', status);
    });

    this.socket.on('session:created', (session: ChatSession) => {
      this.trigger('session:created', session);
    });

    this.socket.on('session:ended', () => {
      this.trigger('session:ended');
    });

    this.socket.on('error', (error: any) => {
      console.error('[Nexvo Widget] Socket error:', error);
      this.trigger('error', error);
    });
  }

  emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[Nexvo Widget] Cannot emit event, socket not connected:', event);
    }
  }

  sendMessage(message: string, visitorId: string, sessionId: string) {
    this.emit('message:send', {
      message,
      visitorId,
      sessionId,
      timestamp: Date.now(),
    });
  }

  sendTyping(isTyping: boolean, visitorId: string, sessionId: string) {
    this.emit('message:typing', {
      isTyping,
      visitorId,
      sessionId,
    });
  }

  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private trigger(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error('[Nexvo Widget] Error in event handler:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketService;
