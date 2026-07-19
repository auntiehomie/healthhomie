import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOONACULAR_MENU_SEARCH_URL = 'https://api.spoonacular.com/food/menuItems/search';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = String(req.query.q ?? '').trim();
  if (!query) return res.status(400).json({ error: 'Missing q query parameter.' });

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'SPOONACULAR_API_KEY is not configured.' });

  const requested = Number(req.query.number);
  const number = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 50) : 20;

  const url = new URL(SPOONACULAR_MENU_SEARCH_URL);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('number', String(number));

  const upstream = await fetch(url);
  const body = await upstream.text();
  if (!upstream.ok) {
    console.error(`Spoonacular menu search failed (${upstream.status}) for query "${query}":`, body.slice(0, 500));
  }
  res.status(upstream.status).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
}
