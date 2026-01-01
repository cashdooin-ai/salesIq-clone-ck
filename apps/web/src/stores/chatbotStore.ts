import { create } from 'zustand';
import type { Chatbot, BotNode, BotEdge, ChatbotFlow } from '@/types';
import { chatbotApiService } from '@/services/chatbotApi';

interface ChatbotState {
  chatbots: Chatbot[];
  currentChatbot: Chatbot | null;
  nodes: BotNode[];
  edges: BotEdge[];
  selectedNode: BotNode | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchChatbots: (params?: { status?: string }) => Promise<void>;
  fetchChatbot: (id: string) => Promise<void>;
  createChatbot: (data: { name: string; description?: string }) => Promise<Chatbot>;
  updateChatbot: (id: string, data: Partial<Chatbot>) => Promise<void>;
  deleteChatbot: (id: string) => Promise<void>;
  setCurrentChatbot: (chatbot: Chatbot | null) => void;

  // Flow actions
  setNodes: (nodes: BotNode[]) => void;
  setEdges: (edges: BotEdge[]) => void;
  addNode: (node: BotNode) => void;
  updateNode: (nodeId: string, data: Partial<BotNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: BotEdge) => void;
  deleteEdge: (edgeId: string) => void;
  setSelectedNode: (node: BotNode | null) => void;
  saveFlow: (chatbotId: string) => Promise<void>;
  loadFlow: (flow: ChatbotFlow) => void;
  clearFlow: () => void;
  validateFlow: () => Promise<{ valid: boolean; errors?: string[] }>;
  publishChatbot: (id: string) => Promise<void>;

  clearError: () => void;
}

export const useChatbotStore = create<ChatbotState>((set, get) => ({
  chatbots: [],
  currentChatbot: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  isLoading: false,
  error: null,

  fetchChatbots: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const chatbots = await chatbotApiService.getChatbots(params);
      set({ chatbots, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch chatbots',
        isLoading: false,
      });
    }
  },

  fetchChatbot: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const chatbot = await chatbotApiService.getChatbot(id);
      set({ currentChatbot: chatbot, isLoading: false });

      // Load flow if exists
      if (chatbot.flow) {
        get().loadFlow(chatbot.flow);
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch chatbot',
        isLoading: false,
      });
    }
  },

  createChatbot: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const chatbot = await chatbotApiService.createChatbot(data);
      set((state) => ({
        chatbots: [chatbot, ...state.chatbots],
        isLoading: false,
      }));
      return chatbot;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create chatbot',
        isLoading: false,
      });
      throw error;
    }
  },

  updateChatbot: async (id: string, data: Partial<Chatbot>) => {
    try {
      set({ isLoading: true, error: null });
      const chatbot = await chatbotApiService.updateChatbot(id, data);
      set((state) => ({
        chatbots: state.chatbots.map((c) => (c.id === id ? chatbot : c)),
        currentChatbot: state.currentChatbot?.id === id ? chatbot : state.currentChatbot,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update chatbot',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteChatbot: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      await chatbotApiService.deleteChatbot(id);
      set((state) => ({
        chatbots: state.chatbots.filter((c) => c.id !== id),
        currentChatbot: state.currentChatbot?.id === id ? null : state.currentChatbot,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete chatbot',
        isLoading: false,
      });
      throw error;
    }
  },

  setCurrentChatbot: (chatbot: Chatbot | null) => {
    set({ currentChatbot: chatbot });
    if (chatbot?.flow) {
      get().loadFlow(chatbot.flow);
    } else {
      get().clearFlow();
    }
  },

  // Flow actions
  setNodes: (nodes: BotNode[]) => {
    set({ nodes });
  },

  setEdges: (edges: BotEdge[]) => {
    set({ edges });
  },

  addNode: (node: BotNode) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },

  updateNode: (nodeId: string, data: Partial<BotNode>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...data } : node
      ),
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, ...data }
          : state.selectedNode,
    }));
  },

  deleteNode: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
    }));
  },

  addEdge: (edge: BotEdge) => {
    set((state) => ({
      edges: [...state.edges, edge],
    }));
  },

  deleteEdge: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    }));
  },

  setSelectedNode: (node: BotNode | null) => {
    set({ selectedNode: node });
  },

  saveFlow: async (chatbotId: string) => {
    try {
      const { nodes, edges } = get();
      set({ isLoading: true, error: null });

      const chatbot = await chatbotApiService.saveFlow(chatbotId, { nodes, edges });

      set((state) => ({
        chatbots: state.chatbots.map((c) => (c.id === chatbotId ? chatbot : c)),
        currentChatbot: state.currentChatbot?.id === chatbotId ? chatbot : state.currentChatbot,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to save flow',
        isLoading: false,
      });
      throw error;
    }
  },

  loadFlow: (flow: ChatbotFlow) => {
    set({
      nodes: flow.nodes || [],
      edges: flow.edges || [],
      selectedNode: null,
    });
  },

  clearFlow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
    });
  },

  validateFlow: async () => {
    try {
      const { nodes, edges } = get();
      const result = await chatbotApiService.validateFlow({ nodes, edges });
      return result;
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.response?.data?.message || 'Failed to validate flow'],
      };
    }
  },

  publishChatbot: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const chatbot = await chatbotApiService.publishChatbot(id);
      set((state) => ({
        chatbots: state.chatbots.map((c) => (c.id === id ? chatbot : c)),
        currentChatbot: state.currentChatbot?.id === id ? chatbot : state.currentChatbot,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to publish chatbot',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
