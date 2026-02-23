const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  health: () => request<{ status: string; version: string }>('/health'),
  join: (body: { user_id: string; space_id: string; display_name?: string }) =>
    request('/api/v1/presence/join', { method: 'POST', body: JSON.stringify(body) }),
  leave: (body: { session_id: string }) =>
    request('/api/v1/presence/leave', { method: 'POST', body: JSON.stringify(body) }),
  update: (body: { session_id: string; status?: string; privacy_level?: number }) =>
    request('/api/v1/presence/update', { method: 'POST', body: JSON.stringify(body) }),
  space: (spaceId: string) => request(`/api/v1/presence/space/${spaceId}`),
  ping: (body: { session_id: string; radius: number; space_id: string }) =>
    request('/api/v1/presence/ping', { method: 'POST', body: JSON.stringify(body) }),
  stats: () => request('/api/v1/presence/stats'),
};
