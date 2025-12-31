import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import {
  WidgetConfig,
  Message,
  Visitor,
  ChatSession,
  ChatState,
  OperatorStatus,
} from '../types';
import ApiService from '../services/api';
import SocketService from '../services/socket';
import {
  getStoredVisitorId,
  setStoredVisitorId,
  getStoredSessionId,
  setStoredSessionId,
} from '../config';

interface UseChatReturn extends ChatState {
  sendMessage: (content: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  initChat: (visitorData?: Partial<Visitor>) => Promise<void>;
  isInitialized: boolean;
  error: string | null;
}

export function useChat(config: WidgetConfig): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [operatorStatus, setOperatorStatus] = useState<OperatorStatus>({ online: false });
  const [session, setSession] = useState<ChatSession | undefined>();
  const [visitor, setVisitor] = useState<Visitor | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiService = useRef<ApiService>();
  const socketService = useRef<SocketService>();
  const typingTimeoutRef = useRef<number>();

  useEffect(() => {
    // Initialize services
    apiService.current = new ApiService(config);
    socketService.current = new SocketService(config);

    return () => {
      // Cleanup on unmount
      socketService.current?.disconnect();
    };
  }, [config]);

  const initChat = useCallback(async (visitorData: Partial<Visitor> = {}) => {
    try {
      setError(null);

      // Check for existing visitor/session
      const existingVisitorId = getStoredVisitorId();
      const existingSessionId = getStoredSessionId();

      let initData;

      if (existingVisitorId && existingSessionId) {
        // Resume existing session
        visitorData.id = existingVisitorId;
      }

      // Initialize visitor and session
      initData = await apiService.current!.initVisitor(visitorData);

      const { visitor: newVisitor, session: newSession } = initData;

      // Store IDs
      setStoredVisitorId(newVisitor.id!);
      setStoredSessionId(newSession.id);

      setVisitor(newVisitor);
      setSession(newSession);

      // Add welcome message
      if (config.welcomeMessage) {
        const welcomeMsg: Message = {
          id: 'welcome-' + Date.now(),
          type: 'system',
          content: config.welcomeMessage,
          timestamp: Date.now(),
        };
        setMessages([welcomeMsg]);
      }

      // Connect to socket
      await socketService.current!.connect(newVisitor.id!, newSession.id);
      setIsConnected(true);

      // Set up socket event handlers
      setupSocketHandlers();

      // Get operator status
      const status = await apiService.current!.getOperatorStatus();
      setOperatorStatus(status);

      setIsInitialized(true);
    } catch (err) {
      console.error('[Nexvo Widget] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize chat');
      setIsConnected(false);
    }
  }, [config]);

  const setupSocketHandlers = useCallback(() => {
    if (!socketService.current) return;

    socketService.current.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    socketService.current.on('operator:typing', ({ isTyping: operatorTyping }) => {
      setIsTyping(operatorTyping);
    });

    socketService.current.on('operator:status', (status: OperatorStatus) => {
      setOperatorStatus(status);
    });

    socketService.current.on('session:ended', () => {
      const systemMsg: Message = {
        id: 'ended-' + Date.now(),
        type: 'system',
        content: 'Chat session has ended. Thank you!',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, systemMsg]);
      setIsConnected(false);
    });

    socketService.current.on('disconnect', () => {
      setIsConnected(false);
    });

    socketService.current.on('error', (error: any) => {
      console.error('[Nexvo Widget] Socket error:', error);
      setError(error.message || 'Connection error');
    });
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !visitor || !session) return;

    const tempId = 'temp-' + Date.now();

    // Optimistic update
    const newMessage: Message = {
      id: tempId,
      type: 'visitor',
      content: content.trim(),
      timestamp: Date.now(),
      senderName: visitor.name,
      status: 'sending',
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      // Send via socket for real-time delivery
      socketService.current?.sendMessage(content.trim(), visitor.id!, session.id);

      // Update message status
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'sent' as const } : msg
        )
      );
    } catch (err) {
      console.error('[Nexvo Widget] Send message error:', err);

      // Update message status to failed
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, status: 'failed' as const } : msg
        )
      );
    }
  }, [visitor, session]);

  const setTyping = useCallback((typing: boolean) => {
    if (!visitor || !session) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketService.current?.sendTyping(typing, visitor.id!, session.id);

    // Auto-clear typing after 3 seconds
    if (typing) {
      typingTimeoutRef.current = window.setTimeout(() => {
        socketService.current?.sendTyping(false, visitor.id!, session.id);
      }, 3000);
    }
  }, [visitor, session]);

  return {
    messages,
    isConnected,
    isTyping,
    operatorStatus,
    session,
    visitor,
    sendMessage,
    setTyping,
    initChat,
    isInitialized,
    error,
  };
}
