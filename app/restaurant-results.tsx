import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, upsertFoodItem } from '@/lib/db/database';
import { deriveMealType } from '@/lib/domain/mealType';
import { todayKey } from '@/lib/domain/nutrition';
import {
  findClosestRestaurantMatch,
  getRestaurantFoodItem,
  searchRestaurantFoods,
  type RestaurantMenuItemSummary,
} from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import type { FoodItem } from '@/types/healthhomie';

export default function RestaurantResultsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ q?: string; hour?: string; date?: string }>();
  const query = params.q ?? '';
  const hour = Number(params.hour ?? new Date().getHours());
  const date = params.date ?? todayKey();

  const [results, setResults] = useState<RestaurantMenuItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    searchRestaurantFoods(query, 50)
      .then((items) => { if (active) setResults(items); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : 'Search failed.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query]);

  async function selectItem(item: RestaurantMenuItemSummary) {
    setLoadingItemId(item.id);
    try {
      setActiveFood(await getRestaurantFoodItem(item.id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Couldn't load that item. Try again.");
    } finally {
      setLoadingItemId(null);
    }
  }

  async function askAiForMatch() {
    if (results.length === 0) return;
    setAiMatching(true);
    setAiNote(null);
    try {
      const result = await findClosestRestaurantMatch(query, results);
      setAiNote(result.note);
      const match = result.bestMatchId != null ? results.find((r) => r.id === result.bestMatchId) : undefined;
      if (match) await selectItem(match);
    } catch (error) {
      setAiNote(error instanceof Error ? error.message : "Couldn't reach AI matching. Try again.");
    } finally {
      setAiMatching(false);
    }
  }

  async function logFood(food: FoodItem, servings: number) {
    await upsertFoodItem(food);
    await addMealEntry({
      id: createId('entry'),
      foodItemId: food.id,
      mealType: deriveMealType(hour),
      hour,
      date,
      servings,
      createdAt: new Date().toISOString(),
    });
    router.back();
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Restaurant results</Text>
      <Text style={styles.subtitle}>“{query}”</Text>

      {loading && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}
      {loadError && <Text style={styles.error}>{loadError}</Text>}

      {!loading && results.length === 0 && !loadError && <Text style={styles.empty}>No restaurant results for this search.</Text>}

      {results.map((item) => (
        <Pressable key={item.id} onPress={() => selectItem(item)} disabled={loadingItemId !== null} style={styles.foodRow}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{item.title}</Text>
            <Text style={styles.foodMeta}>{item.restaurantChain}</Text>
          </View>
          {loadingItemId === item.id ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.foodMacros}>Tap for nutrition</Text>}
        </Pressable>
      ))}

      {results.length > 0 && (
        <Pressable style={styles.aiMatchLink} onPress={askAiForMatch} disabled={aiMatching}>
          {aiMatching ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.aiMatchLinkText}>🤖 Can’t find it? Ask AI for the closest match</Text>
          )}
        </Pressable>
      )}
      {aiNote && <Text style={styles.aiNote}>{aiNote}</Text>}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    title: { ...typography.display2, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    loadingIndicator: { marginTop: 20 },
    error: { color: colors.danger, fontWeight: '600' },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
    foodRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    foodInfo: { flex: 1, marginRight: 12 },
    foodName: { fontWeight: '800', color: colors.text, fontSize: 16, flexWrap: 'wrap' },
    foodMeta: { color: colors.textMuted, marginTop: 4 },
    foodMacros: { fontWeight: '800', color: colors.primary, flexShrink: 0 },
    aiMatchLink: { alignItems: 'center', paddingVertical: 6 },
    aiMatchLinkText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    aiNote: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  });
