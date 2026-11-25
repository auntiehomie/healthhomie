export type PhotoMealItem = { name: string; calories: number; proteinG: number; carbsG: number; fatG: number };

/** Raw JPEG base64 only, bounded below the serverless request limit. Never fetch a user URL. */
export function validMealImage(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 3_500_000 && value.startsWith('/9j/') && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function parsePhotoMeal(text: string): PhotoMealItem[] | null {
  try {
    const result = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
    if (!Array.isArray(result?.items) || result.items.length > 12) return null;
    const items: PhotoMealItem[] = [];
    for (const item of result.items) {
      if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120) return null;
      for (const key of ['calories', 'proteinG', 'carbsG', 'fatG'] as const) {
        if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0 || item[key] > (key === 'calories' ? 5000 : 1000)) return null;
      }
      items.push({ name: item.name.trim(), calories: item.calories, proteinG: item.proteinG, carbsG: item.carbsG, fatG: item.fatG });
    }
    return items;
  } catch { return null; }
}
