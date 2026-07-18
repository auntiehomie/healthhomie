import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeFitbitCode } from '../../lib/services/fitbitApi';
import { verifyOAuthState } from '../../lib/server/auth';
import { storeFitbitTokens } from '../../lib/server/fitbitStore';

const CONNECTED_PATH = '/fitbit/connected';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;
  if (error) return redirectWithError(res, String(error));

  let userId: string;
  try {
    ({ userId } = verifyOAuthState(String(state ?? '')));
  } catch {
    return redirectWithError(res, 'invalid_state');
  }

  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return redirectWithError(res, 'not_configured');

  try {
    const token = await exchangeFitbitCode({ code: String(code), clientId, clientSecret, redirectUri });
    await storeFitbitTokens(userId, token);
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
