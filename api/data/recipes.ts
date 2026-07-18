import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUserId, AuthError } from '../../lib/server/auth';
import { deleteRecipe, listRecipes, saveRecipe } from '../../lib/server/recipeStore';
import { DatabaseNotConfiguredError } from '../../lib/server/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const userId = requireUserId(req);

    if (req.method === 'GET') {
      const recipes = await listRecipes(userId);
      return res.status(200).json({ recipes });
    }

    if (req.method === 'POST') {
      const body = (req.body ?? {}) as {
        id?: string;
        name?: string;
        servings?: number;
        ingredients?: { foodItemId: string; servings: number }[];
      };
      if (!body.name?.trim()) return res.status(400).json({ error: 'Recipe name is required.' });
      if (!body.ingredients?.length) return res.status(400).json({ error: 'Add at least one ingredient.' });

      const recipe = await saveRecipe(userId, {
        id: body.id,
        name: body.name.trim(),
        servings: body.servings ?? 1,
        ingredients: body.ingredients,
      });
      return res.status(200).json({ recipe });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      if (!id) return res.status(400).json({ error: 'id query param required.' });
      const deleted = await deleteRecipe(userId, id);
      if (!deleted) return res.status(404).json({ error: 'Recipe not found.' });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    res.status(405).json({ error: 'GET, POST, or DELETE only.' });
  } catch (error) {
    if (error instanceof AuthError) return res.status(401).json({ error: error.message });
    if (error instanceof DatabaseNotConfiguredError) return res.status(503).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error.' });
  }
}
