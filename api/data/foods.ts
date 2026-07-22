import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { requireUserId, AuthError } from '../../lib/server/auth';
import type { FoodItem } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);
    const sql = getSql();

    if (req.method === 'GET') {
      const foods = await sql`SELECT * FROM food_items WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC, name ASC`;
      return res.status(200).json({ foods });
    }

    if (req.method === 'POST') {
      const food = (req.body ?? {}) as FoodItem;
      if (!food.id || !food.name) return res.status(400).json({ error: 'id and name are required.' });
      await sql`
        INSERT INTO food_items (id, "userId", name, brand, barcode, "servingSize", "servingUnit", source, "sourceId", calories, "proteinG", "carbsG", "fatG", "fiberG", "sugarG", "sodiumMg", favorite, "createdAt", "updatedAt")
        VALUES (${food.id}, ${userId}, ${food.name}, ${food.brand ?? null}, ${food.barcode ?? null}, ${food.servingSize}, ${food.servingUnit}, ${food.source}, ${food.sourceId ?? null}, ${food.calories}, ${food.proteinG}, ${food.carbsG}, ${food.fatG}, ${food.fiberG ?? null}, ${food.sugarG ?? null}, ${food.sodiumMg ?? null}, ${food.favorite ?? false}, ${food.createdAt}, ${food.updatedAt})
        ON CONFLICT ("userId", id) DO UPDATE SET
          name = EXCLUDED.name, brand = EXCLUDED.brand, barcode = EXCLUDED.barcode,
          "servingSize" = EXCLUDED."servingSize", "servingUnit" = EXCLUDED."servingUnit",
          source = EXCLUDED.source, "sourceId" = EXCLUDED."sourceId",
          calories = EXCLUDED.calories, "proteinG" = EXCLUDED."proteinG", "carbsG" = EXCLUDED."carbsG", "fatG" = EXCLUDED."fatG",
          "fiberG" = EXCLUDED."fiberG", "sugarG" = EXCLUDED."sugarG", "sodiumMg" = EXCLUDED."sodiumMg", favorite = EXCLUDED.favorite, "updatedAt" = EXCLUDED."updatedAt"
      `;
      return res.status(204).end();
    }

    res.status(405).json({ error: 'GET or POST only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
