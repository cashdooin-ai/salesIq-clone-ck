import axios, { AxiosInstance } from 'axios';
import type { Chatbot, ChatbotFlow } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ChatbotApiService {
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
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  // Get all chatbots
  async getChatbots(params?: { status?: string }): Promise<Chatbot[]> {
    const response = await this.api.get('/chatbots', { params });
    return response.data;
  }

  // Get single chatbot
  async getChatbot(id: string): Promise<Chatbot> {
    const response = await this.api.get(`/chatbots/${id}`);
    return response.data;
  }

  // Create chatbot
  async createChatbot(data: {
    name: string;
    description?: string;
    flow?: ChatbotFlow;
  }): Promise<Chatbot> {
    const response = await this.api.post('/chatbots', data);
    return response.data;
  }

  // Update chatbot
  async updateChatbot(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      status: string;
      flow: ChatbotFlow;
      triggers: any;
    }>
  ): Promise<Chatbot> {
    const response = await this.api.patch(`/chatbots/${id}`, data);
    return response.data;
  }

  // Delete chatbot
  async deleteChatbot(id: string): Promise<void> {
    await this.api.delete(`/chatbots/${id}`);
  }

  // Save flow data
  async saveFlow(id: string, flow: ChatbotFlow): Promise<Chatbot> {
    const response = await this.api.patch(`/chatbots/${id}/flow`, { flow });
    return response.data;
  }

  // Publish chatbot (set status to active)
  async publishChatbot(id: string): Promise<Chatbot> {
    const response = await this.api.post(`/chatbots/${id}/publish`);
    return response.data;
  }

  // Validate flow before publishing
  async validateFlow(flow: ChatbotFlow): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await this.api.post('/chatbots/validate-flow', { flow });
    return response.data;
  }
}

export const chatbotApiService = new ChatbotApiService();
export default chatbotApiService;
