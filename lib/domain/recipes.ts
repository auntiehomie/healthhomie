import { addMacros, emptyMacros, scaleMacros } from './nutrition';
import type { MacroNutrients, RecipeIngredient } from '@/types/healthhomie';

/** Sum of every ingredient's macros at its recipe quantity — the whole recipe, not one serving. */
export function recipeTotals(ingredients: RecipeIngredient[]): MacroNutrients {
  return ingredients.reduce((total, ing) => (ing.food ? addMacros(total, scaleMacros(ing.food, ing.servings)) : total), emptyMacros());
}

export function recipePerServing(ingredients: RecipeIngredient[], servings: number): MacroNutrients {
  return scaleMacros(recipeTotals(ingredients), 1 / Math.max(servings, 0.01));
}
