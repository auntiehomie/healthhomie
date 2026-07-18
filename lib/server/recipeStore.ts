import { randomUUID } from 'node:crypto';
import { getSql } from './db';
import type { FoodItem, MacroNutrients, Recipe, RecipeIngredient } from '../../types/healthhomie';

function emptyMacros(): MacroNutrients {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, sugarG: 0, sodiumMg: 0 };
}

function scaleMacros(macros: MacroNutrients, factor: number): MacroNutrients {
  return {
    calories: macros.calories * factor,
    proteinG: macros.proteinG * factor,
    carbsG: macros.carbsG * factor,
    fatG: macros.fatG * factor,
    fiberG: (macros.fiberG ?? 0) * factor,
    sugarG: (macros.sugarG ?? 0) * factor,
    sodiumMg: (macros.sodiumMg ?? 0) * factor,
  };
}

function addMacros(a: MacroNutrients, b: MacroNutrients): MacroNutrients {
  return {
    calories: a.calories + b.calories,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
    fiberG: (a.fiberG ?? 0) + (b.fiberG ?? 0),
    sugarG: (a.sugarG ?? 0) + (b.sugarG ?? 0),
    sodiumMg: (a.sodiumMg ?? 0) + (b.sodiumMg ?? 0),
  };
}

/** Sum of every ingredient's macros at its recipe quantity — the whole recipe, not one serving. */
export function recipeTotals(ingredients: RecipeIngredient[]): MacroNutrients {
  return ingredients.reduce((total, ing) => (ing.food ? addMacros(total, scaleMacros(ing.food, ing.servings)) : total), emptyMacros());
}

function toFoodItem(row: Record<string, unknown>): FoodItem {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: (row.brand as string | null) ?? undefined,
    barcode: (row.barcode as string | null) ?? undefined,
    servingSize: row.servingSize as number,
    servingUnit: row.servingUnit as string,
    source: row.source as FoodItem['source'],
    sourceId: (row.sourceId as string | null) ?? undefined,
    calories: row.calories as number,
    proteinG: row.proteinG as number,
    carbsG: row.carbsG as number,
    fatG: row.fatG as number,
    fiberG: (row.fiberG as number | null) ?? undefined,
    sugarG: (row.sugarG as number | null) ?? undefined,
    sodiumMg: (row.sodiumMg as number | null) ?? undefined,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}

export async function listRecipes(userId: string): Promise<Recipe[]> {
  return loadRecipes(userId);
}

export async function getRecipe(userId: string, id: string): Promise<Recipe | null> {
  const recipes = await loadRecipes(userId, id);
  return recipes[0] ?? null;
}

async function loadRecipes(userId: string, onlyId?: string): Promise<Recipe[]> {
  const sql = getSql();
  const recipeRows = onlyId
    ? await sql`SELECT * FROM recipes WHERE "userId" = ${userId} AND id = ${onlyId}`
    : await sql`SELECT * FROM recipes WHERE "userId" = ${userId} ORDER BY "updatedAt" DESC`;
  if (recipeRows.length === 0) return [];

  const recipeIds = recipeRows.map((row) => row.id as string);
  const ingredientRows = await sql`
    SELECT ri.id AS "ingredientId", ri."recipeId" AS "ingredientRecipeId", ri."foodItemId" AS "ingredientFoodItemId",
           ri.servings AS "ingredientServings", ri."sortOrder", fi.*
    FROM recipe_ingredients ri
    JOIN food_items fi ON fi.id = ri."foodItemId" AND fi."userId" = ${userId}
    WHERE ri."recipeId" = ANY(${recipeIds})
    ORDER BY ri."sortOrder" ASC
  `;

  const byRecipe = new Map<string, RecipeIngredient[]>();
  for (const row of ingredientRows) {
    const recipeId = row.ingredientRecipeId as string;
    const list = byRecipe.get(recipeId) ?? [];
    list.push({
      id: row.ingredientId as string,
      foodItemId: row.ingredientFoodItemId as string,
      servings: row.ingredientServings as number,
      food: toFoodItem(row),
    });
    byRecipe.set(recipeId, list);
  }

  return recipeRows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    servings: row.servings as number,
    ingredients: byRecipe.get(row.id as string) ?? [],
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }));
}

export async function saveRecipe(
  userId: string,
  input: { id?: string; name: string; servings: number; ingredients: { foodItemId: string; servings: number }[] }
): Promise<Recipe> {
  const sql = getSql();
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();
  const servings = input.servings > 0 ? input.servings : 1;

  await sql`
    INSERT INTO recipes (id, "userId", name, servings, "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, ${input.name}, ${servings}, ${now}, ${now})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, servings = EXCLUDED.servings, "updatedAt" = EXCLUDED."updatedAt"
  `;

  // Simplest correct strategy for "replace the ingredient list" — no diffing needed since the
  // client always sends the full current list.
  await sql`DELETE FROM recipe_ingredients WHERE "recipeId" = ${id}`;
  for (let i = 0; i < input.ingredients.length; i++) {
    const ingredient = input.ingredients[i];
    await sql`
      INSERT INTO recipe_ingredients (id, "recipeId", "foodItemId", servings, "sortOrder")
      VALUES (${randomUUID()}, ${id}, ${ingredient.foodItemId}, ${ingredient.servings}, ${i})
    `;
  }

  const recipe = await getRecipe(userId, id);
  if (!recipe) throw new Error('Failed to save recipe.');

  await mirrorRecipeAsFoodItem(userId, recipe);
  return recipe;
}

/**
 * Recipes are directly loggable like any other food — mirror the per-serving macros into
 * food_items (source: 'custom', sourceId: the recipe id) so the normal search/log flow picks
 * them up with zero special-casing on the client. Deleting a recipe intentionally leaves this
 * row in place, matching the rest of the app: food_items are never hard-deleted, since past
 * meal_entries reference them by id and would otherwise lose their macros retroactively.
 */
async function mirrorRecipeAsFoodItem(userId: string, recipe: Recipe): Promise<void> {
  const sql = getSql();
  const totals = recipeTotals(recipe.ingredients);
  const perServing = scaleMacros(totals, 1 / Math.max(recipe.servings, 0.01));
  const now = new Date().toISOString();
  const foodId = `recipe-${recipe.id}`;

  await sql`
    INSERT INTO food_items (id, "userId", name, "servingSize", "servingUnit", source, "sourceId", calories, "proteinG", "carbsG", "fatG", "fiberG", "sugarG", "sodiumMg", "createdAt", "updatedAt")
    VALUES (${foodId}, ${userId}, ${recipe.name}, 1, 'serving', 'custom', ${recipe.id}, ${perServing.calories}, ${perServing.proteinG}, ${perServing.carbsG}, ${perServing.fatG}, ${perServing.fiberG ?? null}, ${perServing.sugarG ?? null}, ${perServing.sodiumMg ?? null}, ${now}, ${now})
    ON CONFLICT ("userId", id) DO UPDATE SET
      name = EXCLUDED.name, calories = EXCLUDED.calories, "proteinG" = EXCLUDED."proteinG",
      "carbsG" = EXCLUDED."carbsG", "fatG" = EXCLUDED."fatG", "fiberG" = EXCLUDED."fiberG",
      "sugarG" = EXCLUDED."sugarG", "sodiumMg" = EXCLUDED."sodiumMg", "updatedAt" = EXCLUDED."updatedAt"
  `;
}

export async function deleteRecipe(userId: string, id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`DELETE FROM recipes WHERE id = ${id} AND "userId" = ${userId} RETURNING id`;
  return rows.length > 0;
}
