import { create } from 'zustand';
import type { Conversation, Message, TypingIndicator } from '@/types';
import { apiService } from '@/services/api';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  typingIndicators: TypingIndicator[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchConversations: (params?: { status?: string }) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
  updateConversationStatus: (conversationId: string, status: string) => Promise<void>;
  addTypingIndicator: (indicator: TypingIndicator) => void;
  removeTypingIndicator: (conversationId: string, userId: string) => void;
  clearError: () => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  messages: {},
  typingIndicators: [],
  isLoading: false,
  error: null,

  fetchConversations: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const conversations = await apiService.getConversations(params);
      set({ conversations, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversations',
        isLoading: false,
      });
    }
  },

  fetchConversation: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const conversation = await apiService.getConversation(id);
      const messages = await apiService.getMessages(id);

      set((state) => ({
        conversations: state.conversations.some((c) => c.id === id)
          ? state.conversations.map((c) => (c.id === id ? conversation : c))
          : [...state.conversations, conversation],
        messages: {
          ...state.messages,
          [id]: messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversation',
        isLoading: false,
      });
    }
  },

  setActiveConversation: (id: string | null) => {
    const { conversations, messages } = get();
    const conversation = id ? conversations.find((c) => c.id === id) : null;

    set({
      activeConversationId: id,
      activeConversation: conversation || null,
    });

    // Fetch messages if not already loaded
    if (id && !messages[id]) {
      get().fetchConversation(id);
    }

    // Mark as read
    if (id && conversation && conversation.unreadCount > 0) {
      get().markAsRead(id);
    }
  },

  addConversation: (conversation: Conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));
  },

  updateConversation: (conversation: Conversation) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversation.id ? { ...c, ...conversation } : c
      ),
      activeConversation:
        state.activeConversationId === conversation.id
          ? { ...state.activeConversation, ...conversation } as Conversation
          : state.activeConversation,
    }));
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: [
          ...(state.messages[message.conversationId] || []),
          message,
        ],
      },
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: message,
              updatedAt: message.timestamp,
            }
          : c
      ),
    }));
  },

  updateMessage: (message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.conversationId]: (state.messages[message.conversationId] || []).map(
          (m) => (m.id === message.id ? message : m)
        ),
      },
    }));
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const message = await apiService.sendMessage(conversationId, content);
      get().addMessage(message);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to send message',
      });
      throw error;
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      await apiService.markMessagesAsRead(conversationId);
      get().resetUnreadCount(conversationId);
    } catch (error: any) {
      console.error('Failed to mark messages as read:', error);
    }
  },

  updateConversationStatus: async (conversationId: string, status: string) => {
    try {
      const conversation = await apiService.updateConversationStatus(conversationId, status);
      get().updateConversation(conversation);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update conversation status',
      });
      throw error;
    }
  },

  addTypingIndicator: (indicator: TypingIndicator) => {
    set((state) => ({
      typingIndicators: [
        ...state.typingIndicators.filter(
          (t) =>
            !(
              t.conversationId === indicator.conversationId &&
              t.userId === indicator.userId
            )
        ),
        indicator,
      ],
    }));
  },

  removeTypingIndicator: (conversationId: string, userId: string) => {
    set((state) => ({
      typingIndicators: state.typingIndicators.filter(
        (t) => !(t.conversationId === conversationId && t.userId === userId)
      ),
    }));
  },

  incrementUnreadCount: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: c.unreadCount + 1 }
          : c
      ),
    }));
  },

  resetUnreadCount: (conversationId: string) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
