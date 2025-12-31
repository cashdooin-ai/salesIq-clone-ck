import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserStatus } from '@/types';
import { apiService } from '@/services/api';
import { socketService } from '@/services/socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateStatus: (status: UserStatus) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await apiService.login(email, password);
          const { user, token } = response;

          localStorage.setItem('auth_token', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Connect to socket
          if (user.organizationId) {
            socketService.connect(token, user.organizationId);
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Disconnect socket
          socketService.disconnect();

          // Clear local storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      updateStatus: (status: UserStatus) => {
        const { user } = get();
        if (!user) return;

        set({
          user: { ...user, status },
        });

        // Update status via API
        apiService.updateProfile({ status }).catch(console.error);

        // Update status via socket
        if (status !== 'offline') {
          socketService.updateStatus(status);
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const { user } = get();
          if (!user) return;

          const updatedUser = await apiService.updateProfile(data);

          set({
            user: { ...user, ...updatedUser },
          });
        } catch (error) {
          console.error('Update profile error:', error);
          throw error;
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
