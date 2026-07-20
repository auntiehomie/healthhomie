import type { VercelRequest, VercelResponse } from '@vercel/node';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const FATSECRET_SEARCH_URL = 'https://platform.fatsecret.com/rest/foods/search/v1';

type FatSecretFood = { food_id: string; food_name: string; brand_name?: string; food_description?: string };

// Cached across warm invocations of this function instance so a fresh token isn't fetched on
// every fallback search - FatSecret's client_credentials tokens are valid for 24h.
let cachedFatSecretToken: { token: string; expiresAt: number } | null = null;

async function getFatSecretToken(clientId: string, clientSecret: string): Promise<string | null> {
  if (cachedFatSecretToken && cachedFatSecretToken.expiresAt > Date.now()) return cachedFatSecretToken.token;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(FATSECRET_TOKEN_URL, {
    method: 'POST',
    headers: { authorization: `Basic ${basicAuth}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=basic',
  });
  if (!response.ok) {
    console.error(`FatSecret token request failed (${response.status}):`, (await response.text().catch(() => '')).slice(0, 300));
    return null;
  }
  const payload = await response.json();
  const expiresInMs = (typeof payload.expires_in === 'number' ? payload.expires_in : 3600) * 1000;
  cachedFatSecretToken = { token: payload.access_token, expiresAt: Date.now() + expiresInMs - 60_000 };
  return cachedFatSecretToken.token;
}

// Third and last fallback tier - only reached once both USDA and Open Food Facts have failed.
// Returns null (not an error) when FATSECRET_CLIENT_ID/SECRET aren't configured, or when the
// request fails after retrying, so the caller can fall through to the original USDA error.
async function searchFatSecretFallback(query: string): Promise<FatSecretFood[] | null> {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const token = await getFatSecretToken(clientId, clientSecret);
  if (!token) return null;

  const url = new URL(FATSECRET_SEARCH_URL);
  url.searchParams.set('search_expression', query);
  url.searchParams.set('max_results', '20');
  url.searchParams.set('format', 'json');

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (response.ok) {
      const payload = await response.json();
      const foods = payload.foods?.food;
      if (!foods) return [];
      return Array.isArray(foods) ? foods : [foods];
    }
    console.error(`FatSecret search failed (${response.status}) attempt ${attempt} for query "${query}":`, (await response.text().catch(() => '')).slice(0, 300));
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = String(req.query.q ?? '').trim();
  if (!query) return res.status(400).json({ error: 'Missing q query parameter.' });

  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'USDA_FDC_API_KEY is not configured.' });

  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', '20');
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded');

  // USDA's gateway intermittently drops requests with a bare "nginx 400 Bad Request" HTML
  // page (not a real JSON error from their API) even for identical, valid requests - a couple
  // of quick retries clears it almost every time.
  let upstream: Response;
  let body: string;
  let attempt = 0;
  do {
    upstream = await fetch(url);
    body = await upstream.text();
    attempt += 1;
    const looksLikeGatewayFlake = !upstream.ok && !(upstream.headers.get('content-type') ?? '').includes('json');
    if (!looksLikeGatewayFlake || attempt > 2) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  } while (attempt <= 2);

  if (upstream.ok) {
    res.status(200).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
    return;
  }

  console.error(`USDA search failed (${upstream.status}) after ${attempt} attempt(s) for query "${query}":`, body.slice(0, 500));

  // USDA is still down after retries - fall back to Open Food Facts' free search API so the
  // user gets branded/packaged results instead of a dead end. Generic USDA-only foods (e.g.
  // raw ingredients without a barcode) won't show up here, but most day-to-day searches will.
  // OFF's search endpoint is itself intermittently flaky (measured ~40-60% single-shot failure
  // rate), so it gets the same short retry treatment as USDA above.
  try {
    const fallbackUrl = new URL(OFF_SEARCH_URL);
    fallbackUrl.searchParams.set('search_terms', query);
    fallbackUrl.searchParams.set('search_simple', '1');
    fallbackUrl.searchParams.set('action', 'process');
    fallbackUrl.searchParams.set('json', '1');
    fallbackUrl.searchParams.set('page_size', '20');

    let fallback: Response | null = null;
    for (let fallbackAttempt = 1; fallbackAttempt <= 3; fallbackAttempt += 1) {
      const attemptResponse = await fetch(fallbackUrl, { headers: { 'User-Agent': 'healthhomie/0.1 (https://github.com/auntiehomie/healthhomie)' } });
      if (attemptResponse.ok) {
        fallback = attemptResponse;
        break;
      }
      if (fallbackAttempt < 3) await new Promise((resolve) => setTimeout(resolve, 250 * fallbackAttempt));
    }

    if (fallback) {
      const payload = await fallback.json();
      res.status(200).json({ source: 'openfoodfacts', products: payload.products ?? [] });
      return;
    }
  } catch (fallbackError) {
    console.error('Open Food Facts fallback also failed:', fallbackError);
  }

  // Both USDA and Open Food Facts are down - last resort is FatSecret's search, which also
  // covers generic (non-branded) foods that Open Food Facts doesn't have. Silently skipped if
  // FATSECRET_CLIENT_ID/SECRET aren't configured.
  try {
    const fatSecretFoods = await searchFatSecretFallback(query);
    if (fatSecretFoods) {
      res.status(200).json({ source: 'fatsecret', foods: fatSecretFoods });
      return;
    }
  } catch (fatSecretError) {
    console.error('FatSecret fallback also failed:', fatSecretError);
  }

  res.status(upstream.status).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
}
