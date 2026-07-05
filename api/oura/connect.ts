import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { buildOuraAuthorizeUrl } from '../../lib/services/ouraApi';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.OURA_CLIENT_ID;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !redirectUri) return res.status(503).json({ error: 'OURA_CLIENT_ID/OURA_REDIRECT_URI are not configured.' });

  const state = randomUUID();
  res.setHeader('Set-Cookie', `oura_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  res.writeHead(302, { Location: buildOuraAuthorizeUrl({ clientId, redirectUri, state }) });
  res.end();
}
