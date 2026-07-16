import { apiUrl, getToken } from '@/lib/services/authClient';

export type InviteCode = {
  id: string;
  code: string;
  label: string | null;
  usedByEmail: string | null;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Log in first.');
  return { authorization: `Bearer ${token}` };
}

export async function listInviteCodes(): Promise<InviteCode[]> {
  const response = await fetch(apiUrl('/api/invites'), { headers: await authHeaders() });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to load invite codes.');
  return payload.invites as InviteCode[];
}

export async function createInviteCode(label?: string): Promise<InviteCode> {
  const response = await fetch(apiUrl('/api/invites'), {
    method: 'POST',
    headers: { ...(await authHeaders()), 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? 'Failed to create invite code.');
  return payload.invite as InviteCode;
}

export async function revokeInviteCode(id: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/invites?id=${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Failed to revoke invite code.');
}
