import type { VercelRequest, VercelResponse } from '@vercel/node';

const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

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

  if (!upstream.ok) {
    console.error(`USDA search failed (${upstream.status}) after ${attempt} attempt(s) for query "${query}":`, body.slice(0, 500));
  }
  res.status(upstream.status).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
}
