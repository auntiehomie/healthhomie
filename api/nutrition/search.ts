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

  const upstream = await fetch(url);
  const body = await upstream.text();
  res.status(upstream.status).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
}
