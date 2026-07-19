import type { VercelRequest, VercelResponse } from '@vercel/node';

const SPOONACULAR_MENU_ITEM_URL = 'https://api.spoonacular.com/food/menuItems';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'Missing id query parameter.' });

  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'SPOONACULAR_API_KEY is not configured.' });

  const url = new URL(`${SPOONACULAR_MENU_ITEM_URL}/${encodeURIComponent(id)}`);
  url.searchParams.set('apiKey', apiKey);

  const upstream = await fetch(url);
  const body = await upstream.text();
  if (!upstream.ok) {
    console.error(`Spoonacular menu item lookup failed (${upstream.status}) for id "${id}":`, body.slice(0, 500));
  }
  res.status(upstream.status).setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json').send(body);
}
