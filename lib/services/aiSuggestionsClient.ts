import { apiUrl, getToken } from '@/lib/services/authClient';

export type AiSuggestion = { suggestion: string | null; createdAt: string | null };

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Log in first.');
  return { authorization: `Bearer ${token}` };
}

export async function getCachedSuggestion(): Promise<AiSuggestion> {
  const response = await fetch(apiUrl('/api/ai/suggestions'), { headers: await authHeaders() });
  if (!response.ok) throw new Error('Failed to load suggestions.');
  return response.json();
}

export async function generateSuggestion(forceRefresh = false): Promise<AiSuggestion> {
  const response = await fetch(apiUrl('/api/ai/suggestions'), {
    method: 'POST',
    headers: { ...(await authHeaders()), 'content-type': 'application/json' },
    body: JSON.stringify({ forceRefresh }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to generate suggestions.');
  return payload;
}
