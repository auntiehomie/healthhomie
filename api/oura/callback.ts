import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exchangeOuraCode } from '../../lib/services/ouraApi';

const CONNECTED_PATH = '/oura/connected';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state, error } = req.query;
  if (error) return redirectWithError(res, String(error));

  const cookieState = parseCookies(req.headers.cookie).oura_oauth_state;
  clearStateCookie(res);
  if (!code || !state || state !== cookieState) return redirectWithError(res, 'invalid_state');

  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  const redirectUri = process.env.OURA_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return redirectWithError(res, 'not_configured');

  try {
    const token = await exchangeOuraCode({ code: String(code), clientId, clientSecret, redirectUri });
    const location = new URL(CONNECTED_PATH, `https://${req.headers.host}`);
    location.searchParams.set('access_token', token.access_token);
    location.searchParams.set('refresh_token', token.refresh_token);
    location.searchParams.set('expires_in', String(token.expires_in));
    res.writeHead(302, { Location: location.pathname + location.search });
    res.end();
  } catch {
    redirectWithError(res, 'exchange_failed');
  }
}

function redirectWithError(res: VercelResponse, reason: string) {
  res.writeHead(302, { Location: `${CONNECTED_PATH}?error=${encodeURIComponent(reason)}` });
  res.end();
}

function clearStateCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', 'oura_oauth_state=; Path=/; HttpOnly; Max-Age=0');
}

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}
