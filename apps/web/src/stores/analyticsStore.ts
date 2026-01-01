import { create } from 'zustand';
import { apiService } from '@/services/api';

interface OverviewStats {
  totalConversations: number;
  activeConversations: number;
  totalVisitors: number;
  onlineVisitors: number;
  avgResponseTime: number;
  avgRating: number;
  conversationsToday: number;
  visitorsToday: number;
}

interface ConversationMetrics {
  byStatus: { status: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  byDay: { date: string; count: number }[];
  avgDuration: number;
  resolutionRate: number;
}

interface VisitorMetrics {
  newVisitors: number;
  returningVisitors: number;
  byLocation: { location: string; count: number }[];
  byDevice: { device: string; count: number }[];
  totalSessions: number;
  avgSessionDuration: number;
}

interface OperatorMetric {
  id: string;
  name: string;
  avatar: string | null;
  conversationsHandled: number;
  avgResponseTime: number;
  avgRating: number;
  totalMessages: number;
}

interface OperatorMetrics {
  operators: OperatorMetric[];
  totalOperators: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface AnalyticsState {
  overviewStats: OverviewStats | null;
  conversationMetrics: ConversationMetrics | null;
  visitorMetrics: VisitorMetrics | null;
  operatorMetrics: OperatorMetrics | null;
  dateRange: DateRange;
  isLoading: boolean;
  error: string | null;

  // Actions
  setDateRange: (range: DateRange) => void;
  fetchOverview: () => Promise<void>;
  fetchConversationMetrics: () => Promise<void>;
  fetchVisitorMetrics: () => Promise<void>;
  fetchOperatorMetrics: () => Promise<void>;
  fetchAllMetrics: () => Promise<void>;
  clearError: () => void;
}

// Default date range: last 30 days
const getDefaultDateRange = (): DateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  overviewStats: null,
  conversationMetrics: null,
  visitorMetrics: null,
  operatorMetrics: null,
  dateRange: getDefaultDateRange(),
  isLoading: false,
  error: null,

  setDateRange: (range: DateRange) => {
    set({ dateRange: range });
    // Auto-fetch all metrics when date range changes
    get().fetchAllMetrics();
  },

  fetchOverview: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange } = get();
      const data = await apiService.getAnalyticsOverview(
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      );
      set({ overviewStats: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch overview stats',
        isLoading: false,
      });
    }
  },

  fetchConversationMetrics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange } = get();
      const data = await apiService.getAnalyticsConversations(
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      );
      set({ conversationMetrics: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch conversation metrics',
        isLoading: false,
      });
    }
  },

  fetchVisitorMetrics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange } = get();
      const data = await apiService.getAnalyticsVisitors(
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      );
      set({ visitorMetrics: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch visitor metrics',
        isLoading: false,
      });
    }
  },

  fetchOperatorMetrics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange } = get();
      const data = await apiService.getAnalyticsOperators(
        dateRange.start.toISOString(),
        dateRange.end.toISOString()
      );
      set({ operatorMetrics: data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch operator metrics',
        isLoading: false,
      });
    }
  },

  fetchAllMetrics: async () => {
    try {
      set({ isLoading: true, error: null });
      const { dateRange } = get();
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      const [overview, conversations, visitors, operators] = await Promise.all([
        apiService.getAnalyticsOverview(startDate, endDate),
        apiService.getAnalyticsConversations(startDate, endDate),
        apiService.getAnalyticsVisitors(startDate, endDate),
        apiService.getAnalyticsOperators(startDate, endDate),
      ]);

      set({
        overviewStats: overview,
        conversationMetrics: conversations,
        visitorMetrics: visitors,
        operatorMetrics: operators,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch analytics data',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
