import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  async getProfile() {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<{ name: string; avatar: string; status: string }>) {
    const response = await this.api.patch('/auth/profile', data);
    return response.data;
  }

  // Conversation endpoints
  async getConversations(params?: { status?: string; limit?: number; offset?: number }) {
    const response = await this.api.get('/conversations', { params });
    return response.data;
  }

  async getConversation(id: string) {
    const response = await this.api.get(`/conversations/${id}`);
    return response.data;
  }

  async assignConversation(conversationId: string, operatorId: string) {
    const response = await this.api.post(`/conversations/${conversationId}/assign`, {
      operatorId,
    });
    return response.data;
  }

  async updateConversationStatus(conversationId: string, status: string) {
    const response = await this.api.patch(`/conversations/${conversationId}/status`, {
      status,
    });
    return response.data;
  }

  async addConversationNote(conversationId: string, note: string) {
    const response = await this.api.post(`/conversations/${conversationId}/notes`, {
      note,
    });
    return response.data;
  }

  async addConversationTags(conversationId: string, tags: string[]) {
    const response = await this.api.post(`/conversations/${conversationId}/tags`, {
      tags,
    });
    return response.data;
  }

  // Message endpoints
  async sendMessage(conversationId: string, content: string, type = 'text') {
    const response = await this.api.post(`/conversations/${conversationId}/messages`, {
      content,
      type,
    });
    return response.data;
  }

  async getMessages(conversationId: string, params?: { limit?: number; offset?: number }) {
    const response = await this.api.get(`/conversations/${conversationId}/messages`, {
      params,
    });
    return response.data;
  }

  async markMessagesAsRead(conversationId: string) {
    const response = await this.api.post(`/conversations/${conversationId}/messages/read`);
    return response.data;
  }

  // Visitor endpoints
  async getVisitors(params?: { online?: boolean; limit?: number; offset?: number }) {
    const response = await this.api.get('/visitors', { params });
    return response.data;
  }

  async getVisitor(id: string) {
    const response = await this.api.get(`/visitors/${id}`);
    return response.data;
  }

  async updateVisitorInfo(id: string, data: Partial<{ name: string; email: string; tags: string[] }>) {
    const response = await this.api.patch(`/visitors/${id}`, data);
    return response.data;
  }

  // Stats endpoints
  async getOperatorStats() {
    const response = await this.api.get('/stats/operator');
    return response.data;
  }

  async getOrganizationStats() {
    const response = await this.api.get('/stats/organization');
    return response.data;
  }

  // File upload
  async uploadFile(file: File, conversationId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }

    const response = await this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
