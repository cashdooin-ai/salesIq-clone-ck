import { create } from 'zustand';
import type { Visitor } from '@/types';
import { apiService } from '@/services/api';

interface VisitorState {
  visitors: Visitor[];
  onlineVisitors: Visitor[];
  selectedVisitor: Visitor | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchVisitors: (params?: { online?: boolean }) => Promise<void>;
  fetchVisitor: (id: string) => Promise<void>;
  setSelectedVisitor: (id: string | null) => void;
  addVisitor: (visitor: Visitor) => void;
  updateVisitor: (visitor: Visitor) => void;
  removeVisitor: (visitorId: string) => void;
  updateVisitorInfo: (id: string, data: Partial<Visitor>) => Promise<void>;
  clearError: () => void;
}

export const useVisitorStore = create<VisitorState>((set, get) => ({
  visitors: [],
  onlineVisitors: [],
  selectedVisitor: null,
  isLoading: false,
  error: null,

  fetchVisitors: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const visitors = await apiService.getVisitors(params);

      if (params?.online) {
        set({ onlineVisitors: visitors, isLoading: false });
      } else {
        set({ visitors, isLoading: false });
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch visitors',
        isLoading: false,
      });
    }
  },

  fetchVisitor: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const visitor = await apiService.getVisitor(id);

      set((state) => ({
        visitors: state.visitors.some((v) => v.id === id)
          ? state.visitors.map((v) => (v.id === id ? visitor : v))
          : [...state.visitors, visitor],
        selectedVisitor: state.selectedVisitor?.id === id ? visitor : state.selectedVisitor,
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch visitor',
        isLoading: false,
      });
    }
  },

  setSelectedVisitor: (id: string | null) => {
    const { visitors } = get();
    const visitor = id ? visitors.find((v) => v.id === id) : null;

    set({ selectedVisitor: visitor || null });

    // Fetch visitor details if not already loaded
    if (id && !visitor) {
      get().fetchVisitor(id);
    }
  },

  addVisitor: (visitor: Visitor) => {
    set((state) => ({
      visitors: [visitor, ...state.visitors],
      onlineVisitors: visitor.isOnline
        ? [visitor, ...state.onlineVisitors]
        : state.onlineVisitors,
    }));
  },

  updateVisitor: (visitor: Visitor) => {
    set((state) => ({
      visitors: state.visitors.map((v) => (v.id === visitor.id ? visitor : v)),
      onlineVisitors: visitor.isOnline
        ? state.onlineVisitors.map((v) => (v.id === visitor.id ? visitor : v))
        : state.onlineVisitors.filter((v) => v.id !== visitor.id),
      selectedVisitor:
        state.selectedVisitor?.id === visitor.id ? visitor : state.selectedVisitor,
    }));
  },

  removeVisitor: (visitorId: string) => {
    set((state) => ({
      onlineVisitors: state.onlineVisitors.filter((v) => v.id !== visitorId),
    }));
  },

  updateVisitorInfo: async (id: string, data: Partial<Visitor>) => {
    try {
      const visitor = await apiService.updateVisitorInfo(id, data);
      get().updateVisitor(visitor);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to update visitor',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
