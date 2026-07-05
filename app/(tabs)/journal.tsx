import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, listFoodItems, listMealEntries, upsertFoodItem } from '@/lib/db/database';
import { summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { searchUsdaFoods } from '@/lib/services/nutritionApi';
import type { FoodItem, MealEntry, MealType } from '@/types/healthhomie';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function JournalScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextFoods, nextEntries] = await Promise.all([listFoodItems(), listMealEntries(todayKey())]);
    setFoods(nextFoods);
    setEntries(nextEntries);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(console.warn); }, [load]));
  const summary = useMemo(() => summarizeDay(todayKey(), entries, foods), [entries, foods]);

  async function logFood(food: FoodItem, servings: number) {
    await upsertFoodItem(food);
    await addMealEntry({ id: createId('entry'), foodItemId: food.id, mealType: selectedMeal, date: todayKey(), servings, createdAt: new Date().toISOString() });
    setActiveFood(null);
    setResults([]);
    setQuery('');
    await load();
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchUsdaFoods(query));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed. Check that USDA_FDC_API_KEY is configured.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Food journal</Text>
      <Text style={styles.subtitle}>Search USDA foods or tap a saved food to log it.</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{Math.round(summary.calories)} kcal</Text>
        <Text style={styles.summaryText}>{Math.round(summary.proteinG)}g protein · {Math.round(summary.carbsG)}g carbs · {Math.round(summary.fatG)}g fat</Text>
      </View>

      <Text style={styles.label}>Meal</Text>
      <View style={styles.mealRow}>{mealTypes.map((meal) => (
        <Pressable key={meal} onPress={() => setSelectedMeal(meal)} style={[styles.chip, selectedMeal === meal && styles.chipActive]}>
          <Text style={[styles.chipText, selectedMeal === meal && styles.chipTextActive]}>{meal}</Text>
        </Pressable>
      ))}</View>

      <Text style={styles.label}>Search foods</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          placeholder="e.g. chicken breast"
          returnKeyType="search"
          style={[styles.input, styles.searchInput]}
        />
        <Pressable style={styles.searchButton} onPress={runSearch} disabled={searching}>
          {searching ? <ActivityIndicator color="#fffaf2" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </Pressable>
      </View>
      {searchError && <Text style={styles.error}>{searchError}</Text>}
      {results.map((food) => (
        <Pressable key={food.id} onPress={() => setActiveFood(food)} style={styles.foodRow}>
          <View>
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.foodMeta}>{food.servingSize}{food.servingUnit} · {food.source}</Text>
          </View>
          <Text style={styles.foodMacros}>{Math.round(food.calories)} kcal</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Your foods</Text>
      {foods.map((food) => (
        <Pressable key={food.id} onPress={() => setActiveFood(food)} style={styles.foodRow}>
          <View>
            <Text style={styles.foodName}>{food.name}</Text>
            <Text style={styles.foodMeta}>{food.servingSize}{food.servingUnit} · {food.source}</Text>
          </View>
          <Text style={styles.foodMacros}>{Math.round(food.calories)} kcal</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Today’s entries</Text>
      {entries.length === 0 ? <Text style={styles.empty}>Nothing logged yet. Tap a food above to start.</Text> : entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodItemId);
        return <Text key={entry.id} style={styles.entry}>• {entry.mealType}: {food?.name ?? 'Food'} × {entry.servings}</Text>;
      })}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14, backgroundColor: '#fffaf2' },
  title: { fontSize: 32, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', lineHeight: 20 },
  summary: { backgroundColor: '#211d18', borderRadius: 24, padding: 18 },
  summaryValue: { color: '#fffaf2', fontSize: 30, fontWeight: '900' },
  summaryText: { color: '#dfd6c8' },
  label: { color: '#211d18', fontWeight: '800', marginTop: 8 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#f0e7da' },
  chipActive: { backgroundColor: '#4f7c59' },
  chipText: { color: '#665f54', fontWeight: '700' },
  chipTextActive: { color: '#fffaf2' },
  input: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, fontSize: 18 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  searchInput: { flex: 1 },
  searchButton: { backgroundColor: '#4f7c59', borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  searchButtonText: { color: '#fffaf2', fontWeight: '800' },
  error: { color: '#b3423b', fontWeight: '600' },
  foodRow: { backgroundColor: '#ffffff', borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodName: { fontWeight: '800', color: '#211d18', fontSize: 16 },
  foodMeta: { color: '#7a7165', marginTop: 4 },
  foodMacros: { fontWeight: '800', color: '#4f7c59' },
  entry: { color: '#443d34', lineHeight: 22 },
  empty: { color: '#7a7165', fontStyle: 'italic' },
});
