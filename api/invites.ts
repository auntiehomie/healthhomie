import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireOwner, AuthError, ForbiddenError } from '../lib/server/auth';
import { createInviteCode, listInviteCodes, revokeInviteCode } from '../lib/server/inviteStore';
import { DatabaseNotConfiguredError } from '../lib/server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Invite codes are the only way in besides the owner's own bootstrap secret, so only the
    // owner can mint or revoke them — for now, at least.
    const userId = requireOwner(req);

    if (req.method === 'GET') {
      const invites = await listInviteCodes(userId);
      return res.status(200).json({ invites });
    }

    if (req.method === 'POST') {
      const { label } = (req.body ?? {}) as { label?: string };
      const invite = await createInviteCode(userId, typeof label === 'string' && label.trim() ? label.trim() : undefined);
      return res.status(201).json({ invite });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      if (!id) return res.status(400).json({ error: 'id query param required.' });
      const revoked = await revokeInviteCode(userId, id);
      if (!revoked) return res.status(404).json({ error: 'Invite code not found or already used/revoked.' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'GET, POST, or DELETE only.' });
  } catch (error) {
    if (error instanceof ForbiddenError) return res.status(403).json({ error: error.message });
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Invite request failed.' });
  }
}
