import { apiUrl, getToken } from '@/lib/services/authClient';

export interface ProStatus {
  isPro: boolean;
  subscribedAt?: string;
  expiresAt?: string;
  expiredAt?: string;
}

export async function getProStatus(): Promise<ProStatus> {
  const token = await getToken();
  if (!token) return { isPro: false };
  const response = await fetch(apiUrl('/api/pro/status'), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { isPro: false };
  return response.json();
}

export async function subscribePro(): Promise<ProStatus & { message?: string }> {
  const token = await getToken();
  if (!token) throw new Error('Authentication required.');
  const response = await fetch(apiUrl('/api/pro/subscribe'), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Subscription failed.');
  return payload;
}
