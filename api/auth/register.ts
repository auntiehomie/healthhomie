import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { getSql, DatabaseNotConfiguredError } from '../../lib/server/db';
import { hashPassword, signAuthToken } from '../../lib/server/auth';
import type { FoodItem } from '../../types/healthhomie';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only.' });

  const { email, password, signupSecret } = (req.body ?? {}) as { email?: string; password?: string; signupSecret?: string };

  const expectedSecret = process.env.SIGNUP_SECRET;
  if (!expectedSecret) return res.status(503).json({ error: 'Signups are not configured.' });
  if (signupSecret !== expectedSecret) return res.status(403).json({ error: 'Invalid signup code.' });

  if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Valid email required.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.length > 0) return res.status(409).json({ error: 'An account with that email already exists.' });

    const userId = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);
    await sql`INSERT INTO users (id, email, "passwordHash", "createdAt") VALUES (${userId}, ${normalizedEmail}, ${passwordHash}, ${now})`;
    await seedDemoFoods(userId);

    res.status(201).json({ token: signAuthToken(userId) });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed.' });
  }
}

async function seedDemoFoods(userId: string) {
  const sql = getSql();
  const now = new Date().toISOString();
  const foods: FoodItem[] = [
    { id: 'demo-greek-yogurt', name: 'Greek yogurt', brand: 'Demo', servingSize: 170, servingUnit: 'g', source: 'manual', calories: 100, proteinG: 17, carbsG: 6, fatG: 0, createdAt: now, updatedAt: now },
    { id: 'demo-oats', name: 'Rolled oats', brand: 'Demo', servingSize: 40, servingUnit: 'g', source: 'manual', calories: 150, proteinG: 5, carbsG: 27, fatG: 3, fiberG: 4, createdAt: now, updatedAt: now },
    { id: 'demo-chicken-rice', name: 'Chicken + rice bowl', brand: 'Homie meal', servingSize: 1, servingUnit: 'bowl', source: 'custom', calories: 520, proteinG: 42, carbsG: 58, fatG: 12, createdAt: now, updatedAt: now },
  ];
  for (const food of foods) {
    await sql`
      INSERT INTO food_items (id, "userId", name, brand, barcode, "servingSize", "servingUnit", source, "sourceId", calories, "proteinG", "carbsG", "fatG", "fiberG", "sugarG", "sodiumMg", "createdAt", "updatedAt")
      VALUES (${food.id}, ${userId}, ${food.name}, ${food.brand ?? null}, ${food.barcode ?? null}, ${food.servingSize}, ${food.servingUnit}, ${food.source}, ${food.sourceId ?? null}, ${food.calories}, ${food.proteinG}, ${food.carbsG}, ${food.fatG}, ${food.fiberG ?? null}, ${food.sugarG ?? null}, ${food.sodiumMg ?? null}, ${food.createdAt}, ${food.updatedAt})
      ON CONFLICT ("userId", id) DO NOTHING
    `;
  }
}
