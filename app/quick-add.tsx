import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { FoodRow } from '@/components/health/FoodRow';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, listFoodItems, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType } from '@/lib/domain/mealType';
import { todayKey } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { hapticSuccess } from '@/lib/utils/haptics';
import type { FoodItem } from '@/types/healthhomie';

export default function QuickAddScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    listFoodItems().then((next) => { if (active) setFoods(next); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const favorites = foods.filter((food) => food.favorite);
  const recipes = favorites.filter((food) => food.id.startsWith('recipe-'));
  const quickAddFoods = favorites.filter((food) => !food.id.startsWith('recipe-'));

  async function logFood(food: FoodItem, servings: number, hour: number) {
    await upsertFoodItem(food);
    await addMealEntry({
      id: createId('entry'),
      foodItemId: food.id,
      mealType: deriveMealType(hour),
      hour,
      date: todayKey(),
      servings,
      createdAt: new Date().toISOString(),
    });
    hapticSuccess();
    router.back();
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Quick add</Text>
      <Text style={styles.subtitle}>Saved foods and recipes — tap one to log it for today.</Text>

      {loading && <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />}

      {!loading && favorites.length === 0 && (
        <Text style={styles.empty}>Nothing saved yet — star a food or recipe to see it here.</Text>
      )}

      {recipes.length > 0 && (
        <>
          <Text style={styles.label}>Recipes</Text>
          {recipes.map((food) => (
            <FoodRow
              key={food.id}
              title={foodDisplayName(food)}
              meta={`${food.servingSize}${food.servingUnit} · recipe`}
              rightLabel={`${Math.round(food.calories)} kcal`}
              onPress={() => setActiveFood(food)}
            />
          ))}
        </>
      )}

      {quickAddFoods.length > 0 && (
        <>
          <Text style={styles.label}>Quick add foods</Text>
          {quickAddFoods.map((food) => (
            <FoodRow
              key={food.id}
              title={foodDisplayName(food)}
              meta={`${food.servingSize}${food.servingUnit} · ${food.source}`}
              rightLabel={`${Math.round(food.calories)} kcal`}
              onPress={() => setActiveFood(food)}
            />
          ))}
        </>
      )}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} initialHour={new Date().getHours()} />
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
    empty: { color: colors.textMuted, fontStyle: 'italic' },
    label: { color: colors.text, fontWeight: '800', marginTop: 4 },
  });
