import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { createId, addMealEntry, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType } from '@/lib/domain/mealType';
import { apiUrl, getToken } from '@/lib/services/authClient';
import { searchUsdaFoods } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { FoodItem } from '@/types/healthhomie';

type Part = { id: string; query: string; candidates: FoodItem[]; food: FoodItem | null; servings: string; error?: string };

export function MealBuilder({ date, hour, savedFoods, onSaved }: { date: string; hour: number; savedFoods: FoodItem[]; onSaved: () => Promise<void> }) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    box: { padding: 16, borderRadius: 16, backgroundColor: colors.surfaceAlt, gap: 10 },
    title: { color: colors.text, fontSize: 17, fontWeight: '700' },
    text: { color: colors.text }, muted: { color: colors.textMuted },
    input: { padding: 10, borderRadius: 8, backgroundColor: colors.surface, color: colors.text },
    button: { padding: 10, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' },
    buttonText: { color: colors.onPrimary, fontWeight: '700' },
    row: { padding: 10, borderRadius: 8, backgroundColor: colors.surface, gap: 7 },
    link: { color: colors.primary, fontWeight: '700', paddingVertical: 5 },
    error: { color: colors.danger },
  }), [colors]);
  const [description, setDescription] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [target, setTarget] = useState({ date, hour });
  const [error, setError] = useState<string | null>(null);

  function update(id: string, changes: Partial<Part>) { setParts((old) => old.map((p) => p.id === id ? { ...p, ...changes } : p)); }
  async function searchPart(part: Part) {
    try {
      const results = await searchUsdaFoods(part.query);
      const saved = savedFoods.filter((f) => foodDisplayName(f).toLowerCase().includes(part.query.toLowerCase()));
      const candidates = [...saved, ...results.filter((f) => !saved.some((s) => s.id === f.id))].slice(0, 5);
      update(part.id, { candidates, food: null, error: candidates.length ? undefined : 'No matches. Edit the search and try again.' });
    } catch { update(part.id, { candidates: [], error: 'Search unavailable. Try again.' }); }
  }
  async function prepare() {
    if (!description.trim() || loading) return;
    setLoading(true); setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to use meal suggestions.');
      const response = await fetch(apiUrl('/api/ai/food-match'), { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ description }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not read this meal.');
      const next: Part[] = (body.items as string[]).map((query) => ({ id: createId('entry'), query, candidates: [], food: null, servings: '1' }));
      setTarget({ date, hour });
      setParts(next);
      await Promise.all(next.map(searchPart));
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setLoading(false); }
  }
  const valid = parts.length > 0 && parts.every((p) => p.food && Number.isFinite(Number(p.servings)) && Number(p.servings) > 0);
  const total = parts.reduce((sum, p) => sum + (p.food ? p.food.calories * (Number(p.servings) || 0) : 0), 0);
  async function save() {
    if (!valid || saving) return;
    setSaving(true); setLocked(true); setError(null);
    try {
      // IDs remain stable across retries; POST is idempotent, so a partial failure cannot duplicate entries.
      for (const part of parts) {
        const food = part.food!;
        const existing = savedFoods.find((f) => f.id === food.id);
        await upsertFoodItem(existing ? { ...food, favorite: existing.favorite } : food);
        await addMealEntry({ id: part.id, foodItemId: food.id, mealType: deriveMealType(target.hour), hour: target.hour, date: target.date, servings: Number(part.servings), createdAt: new Date().toISOString() });
      }
      await onSaved();
      setParts([]); setDescription(''); setLocked(false);
    } catch { setError('Some items may have saved. Retry to finish without duplicating them.'); }
    finally { setSaving(false); }
  }
  return <View style={styles.box}>
    <Text style={styles.title}>Build a meal</Text>
    <Text style={styles.muted}>Describe your meal. Your description is sent to the AI service to suggest searches. Choose each match and check portions before saving.</Text>
    <TextInput accessibilityLabel="Meal description" style={styles.input} value={description} onChangeText={setDescription} placeholder="e.g. eggs, toast and butter" placeholderTextColor={colors.textMuted} multiline maxLength={500} editable={!saving && !locked} />
    <Pressable style={styles.button} onPress={prepare} disabled={loading || saving || locked || !description.trim()}><Text style={styles.buttonText}>{loading ? 'Finding foods…' : 'Find foods'}</Text></Pressable>
    {loading && <ActivityIndicator color={colors.primary} />}
    {parts.map((part) => <View key={part.id} style={styles.row}>
      <Text style={styles.text}>Search for:</Text>
      <TextInput accessibilityLabel="Food search" style={styles.input} value={part.query} onChangeText={(query) => update(part.id, { query, food: null, candidates: [] })} editable={!saving && !locked} />
      <Pressable onPress={() => void searchPart(part)} disabled={saving || locked || !part.query.trim()}><Text style={styles.link}>Search again</Text></Pressable>
      {part.error && <Text style={styles.error}>{part.error}</Text>}
      {part.food ? <>
        <Text style={styles.text}>{foodDisplayName(part.food)} · {part.food.source}</Text>
        <Text style={styles.muted}>One serving: {part.food.servingSize} {part.food.servingUnit} · {Math.round(part.food.calories)} kcal</Text>
        <Text style={styles.text}>Number of servings (check this amount)</Text>
        <TextInput accessibilityLabel={`Servings for ${foodDisplayName(part.food)}`} style={styles.input} value={part.servings} onChangeText={(servings) => update(part.id, { servings })} keyboardType="decimal-pad" editable={!saving && !locked} />
        <Pressable onPress={() => update(part.id, { food: null })} disabled={saving || locked}><Text style={styles.link}>Change match</Text></Pressable>
      </> : part.candidates.map((food) => <Pressable key={food.id} onPress={() => update(part.id, { food })} disabled={saving || locked}><Text style={styles.link}>{foodDisplayName(food)} · {food.servingSize} {food.servingUnit} · {Math.round(food.calories)} kcal · {food.source}</Text></Pressable>)}
      <Pressable onPress={() => setParts((old) => old.filter((p) => p.id !== part.id))} disabled={saving || locked}><Text style={styles.link}>Remove food</Text></Pressable>
    </View>)}
    {parts.length > 0 && <><Text style={styles.muted}>For {target.date} at {target.hour}:00</Text><Text style={styles.text}>Selected total: {Math.round(total)} kcal · review every match and serving</Text><Pressable style={styles.button} onPress={save} disabled={!valid || saving || loading}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Add meal to journal'}</Text></Pressable></>}
    {error && <Text style={styles.error}>{error}</Text>}
  </View>;
}
