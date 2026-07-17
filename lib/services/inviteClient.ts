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

/** Thrown when the current account isn't the app owner — expected for everyone but the owner, not a bug to surface as an error. */
export class InviteForbiddenError extends Error {}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Log in first.');
  return { authorization: `Bearer ${token}` };
}

async function throwForResponse(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => ({}));
  if (response.status === 403) throw new InviteForbiddenError(payload.error ?? fallback);
  throw new Error(payload.error ?? fallback);
}

export async function listInviteCodes(): Promise<InviteCode[]> {
  const response = await fetch(apiUrl('/api/invites'), { headers: await authHeaders() });
  if (!response.ok) await throwForResponse(response, 'Failed to load invite codes.');
  const payload = await response.json();
  return payload.invites as InviteCode[];
}

export async function createInviteCode(label?: string): Promise<InviteCode> {
  const response = await fetch(apiUrl('/api/invites'), {
    method: 'POST',
    headers: { ...(await authHeaders()), 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) await throwForResponse(response, 'Failed to create invite code.');
  const payload = await response.json();
  return payload.invite as InviteCode;
}

export async function revokeInviteCode(id: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/invites?id=${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!response.ok) await throwForResponse(response, 'Failed to revoke invite code.');
}
