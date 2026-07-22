import type { VercelRequest, VercelResponse } from '@vercel/node';

const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';

// Fetches + parses as JSON, retrying a couple of times only when the response looks like a
// gateway flake (non-2xx, or a body that fails to parse) rather than a clean, valid response -
// mirrors the retry pattern already used for USDA/Open Food Facts search.
async function fetchJsonWithRetry(url: string, init: RequestInit, attempts = 3): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, init);
    lastStatus = response.status;
    try {
      const body = await response.json();
      if (response.ok) return { ok: true, body };
      // A clean, valid JSON error (e.g. Open Food Facts' real 404 "not found") isn't a flake -
      // no point retrying it.
      return { ok: false, status: response.status };
    } catch {
      // Non-JSON body (an HTML error page, etc.) - treat as a flake and retry.
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
  return { ok: false, status: lastStatus || 502 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const barcode = String(req.query.barcode ?? '').trim();
  if (!barcode) return res.status(400).json({ error: 'Missing barcode.' });

  const off = await fetchJsonWithRetry(
    `${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}.json`,
    { headers: { 'User-Agent': 'healthhomie/0.1 (https://github.com/auntiehomie/healthhomie)' } }
  );

  if (off.ok) {
    const payload = off.body as { product?: unknown };
    if (payload.product) return res.status(200).json(payload);
    // Valid response, genuinely no product for this barcode - fall through to the USDA fallback.
  } else {
    console.error(`Open Food Facts barcode lookup failed (${off.status}) for "${barcode}"`);
  }

  // Fall back to USDA's branded database, searching by the barcode text itself - it's matched
  // against the gtinUpc field, so only trust an exact match rather than whatever the search
  // engine's relevance ranking surfaces first.
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (apiKey) {
    const usdaUrl = new URL(USDA_SEARCH_URL);
    usdaUrl.searchParams.set('api_key', apiKey);
    usdaUrl.searchParams.set('query', barcode);
    usdaUrl.searchParams.set('pageSize', '10');
    usdaUrl.searchParams.set('dataType', 'Branded');

    const usda = await fetchJsonWithRetry(usdaUrl.toString(), {});
    if (usda.ok) {
      const payload = usda.body as { foods?: { gtinUpc?: string }[] };
      const match = payload.foods?.find((food) => food.gtinUpc === barcode);
      if (match) return res.status(200).json({ source: 'usda', food: match });
    } else {
      console.error(`USDA barcode fallback failed (${usda.status}) for "${barcode}"`);
    }
  }

  if (!off.ok) {
    return res.status(502).json({ error: 'Barcode lookup failed - both Open Food Facts and USDA were unavailable. Try again in a moment.' });
  }
  return res.status(404).json({ error: 'Product not found.' });
}
