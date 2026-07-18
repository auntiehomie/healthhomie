import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, upsertFoodItem } from '@/lib/db/database';
import { todayKey } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { FoodItem, MealType } from '@/types/healthhomie';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('snack');
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [loggedMessage, setLoggedMessage] = useState<string | null>(null);

  async function logFood(food: FoodItem, servings: number) {
    await upsertFoodItem(food);
    await addMealEntry({ id: createId('entry'), foodItemId: food.id, mealType: selectedMeal, date: todayKey(), servings, createdAt: new Date().toISOString() });
    setActiveFood(null);
    setLoggedMessage(`Logged ${food.name} to ${selectedMeal}.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan a barcode</Text>
      <Text style={styles.subtitle}>Point the camera at a packaged food and its nutrition facts pop up, ready to log.</Text>

      <Text style={styles.label}>Log to</Text>
      <View style={styles.mealRow}>
        {mealTypes.map((meal) => (
          <Pressable key={meal} onPress={() => setSelectedMeal(meal)} style={[styles.chip, selectedMeal === meal && styles.chipActive]}>
            <Text style={[styles.chipText, selectedMeal === meal && styles.chipTextActive]}>{meal}</Text>
          </Pressable>
        ))}
      </View>

      <BarcodeScanner
        onFound={(food) => {
          setLoggedMessage(null);
          setActiveFood(food);
        }}
      />

      {loggedMessage && <Text style={styles.loggedMessage}>{loggedMessage}</Text>}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    label: { color: colors.text, fontWeight: '800', marginTop: 4 },
    mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.chipBackground },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '700' },
    chipTextActive: { color: colors.onPrimary },
    loggedMessage: { color: colors.success, fontWeight: '700', textAlign: 'center' },
  });
