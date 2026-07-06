import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeOuraCode } from '../../lib/services/ouraApi';
import { verifyOAuthState } from '../../lib/server/auth';
import { storeOuraTokens } from '../../lib/server/ouraStore';

const CONNECTED_PATH = '/oura/connected';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;
  if (error) return redirectWithError(res, String(error));

  let userId: string;
  try {
    ({ userId } = verifyOAuthState(String(state ?? '')));
  } catch {
    return redirectWithError(res, 'invalid_state');
  }

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return redirectWithError(res, 'not_configured');

  try {
    const token = await exchangeOuraCode({ code: String(code), clientId, clientSecret, redirectUri });
    await storeOuraTokens(userId, token);
    res.writeHead(302, { Location: `${CONNECTED_PATH}?connected=true` });
    res.end();
  } catch {
    redirectWithError(res, 'exchange_failed');
  }
}

function redirectWithError(res: VercelResponse, reason: string) {
  res.writeHead(302, { Location: `${CONNECTED_PATH}?error=${encodeURIComponent(reason)}` });
  res.end();
}
