import { apiUrl, getToken } from '@/lib/services/authClient';

export async function promoteToOwner(email: string): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Log in first.');
  const response = await fetch(apiUrl('/api/admin/promote-owner'), {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to promote account.');
  return payload.email as string;
}
