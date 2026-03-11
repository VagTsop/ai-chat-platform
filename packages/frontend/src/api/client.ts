const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  getMe: () => request<any>('/auth/me'),
  getTiers: () => request<any>('/auth/tiers'),

  // API Keys
  getApiKeys: () => request<any[]>('/auth/api-keys'),
  createApiKey: (name: string) =>
    request<any>('/auth/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteApiKey: (id: string) =>
    request<void>(`/auth/api-keys/${id}`, { method: 'DELETE' }),

  // Admin
  getAdminUsers: () => request<any[]>('/admin/users'),
  updateAdminUser: (id: string, data: any) =>
    request<any>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdminUser: (id: string) =>
    request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  getAdminStats: () => request<any>('/admin/stats'),

  // Conversations
  getConversations: () => request<any[]>('/conversations'),
  createConversation: (data?: { title?: string; model?: string; system_prompt?: string }) =>
    request<any>('/conversations', { method: 'POST', body: JSON.stringify(data || {}) }),
  updateConversation: (id: string, data: any) =>
    request<any>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteConversation: (id: string) =>
    request<void>(`/conversations/${id}`, { method: 'DELETE' }),
  getMessages: (convId: string) => request<any[]>(`/conversations/${convId}/messages`),
  exportConversation: (id: string) => `${BASE}/conversations/${id}/export`,

  // Documents
  getDocuments: (conversationId?: string) =>
    request<any[]>(`/documents${conversationId ? `?conversation_id=${conversationId}` : ''}`),
  uploadDocument: async (file: File, conversationId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('conversation_id', conversationId);
    const token = getToken();
    const res = await fetch(`${BASE}/documents`, {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: 'DELETE' }),

  // System Prompts
  getPrompts: () => request<any[]>('/prompts'),
  createPrompt: (name: string, content: string) =>
    request<any>('/prompts', { method: 'POST', body: JSON.stringify({ name, content }) }),
  deletePrompt: (id: string) =>
    request<void>(`/prompts/${id}`, { method: 'DELETE' }),

  // Analytics
  getUsageSummary: () => request<any>('/analytics/summary'),
  getDailyUsage: (days = 30) => request<any[]>(`/analytics/usage?days=${days}`),
  getCostsByModel: (days = 30) => request<any[]>(`/analytics/costs?days=${days}`),

  // Streaming chat
  streamChat: async (conversationId: string, content: string, onDelta: (text: string) => void, onDone: (usage: any) => void, onError: (err: string) => void) => {
    const token = getToken();
    const res = await fetch(`${BASE}/chat/${conversationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      onError(body.error || 'Access denied');
      return;
    }
    if (!res.ok) {
      onError(`API error: ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'delta') onDelta(event.content);
          else if (event.type === 'done') onDone(event);
          else if (event.type === 'error') onError(event.error);
        } catch {}
      }
    }
  },
};
