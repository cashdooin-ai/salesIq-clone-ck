import { WidgetConfig, Visitor, ChatSession } from '../types';

class ApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: WidgetConfig) {
    this.baseUrl = config.apiUrl || 'https://api.nexvo.io';
    this.apiKey = config.apiKey;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async initVisitor(visitorData: Partial<Visitor> = {}): Promise<{ visitor: Visitor; session: ChatSession }> {
    return this.fetch('/api/widget/init', {
      method: 'POST',
      body: JSON.stringify({
        visitorData,
        metadata: {
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      }),
    });
  }

  async sendMessage(sessionId: string, visitorId: string, content: string): Promise<any> {
    return this.fetch('/api/widget/messages', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        visitorId,
        content,
      }),
    });
  }

  async getOperatorStatus(): Promise<{ online: boolean; name?: string; avatar?: string }> {
    return this.fetch('/api/widget/operator-status', {
      method: 'GET',
    });
  }

  async endSession(sessionId: string): Promise<void> {
    return this.fetch(`/api/widget/sessions/${sessionId}/end`, {
      method: 'POST',
    });
  }

  async uploadFile(file: File, sessionId: string): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    const response = await fetch(`${this.baseUrl}/api/widget/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async getChatHistory(visitorId: string): Promise<any[]> {
    return this.fetch(`/api/widget/history?visitorId=${visitorId}`, {
      method: 'GET',
    });
  }
}

export default ApiService;
