import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const barcode = String(req.query.barcode ?? '').trim();
  if (!barcode) return res.status(400).json({ error: 'Missing barcode.' });

  const upstream = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': 'healthhomie/0.1 (https://github.com/auntiehomie/healthhomie)' },
  });
  const payload = await upstream.json();
  if (!payload.product) return res.status(404).json({ error: 'Product not found.' });
  res.status(200).json(payload);
}
