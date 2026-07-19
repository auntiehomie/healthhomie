import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { HourPicker } from '@/components/health/HourPicker';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType, formatHour } from '@/lib/domain/mealType';
import { todayKey } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import type { FoodItem } from '@/types/healthhomie';

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [loggedMessage, setLoggedMessage] = useState<string | null>(null);

  async function logFood(food: FoodItem, servings: number) {
    await upsertFoodItem(food);
    await addMealEntry({
      id: createId('entry'),
      foodItemId: food.id,
      mealType: deriveMealType(selectedHour),
      hour: selectedHour,
      date: todayKey(),
      servings,
      createdAt: new Date().toISOString(),
    });
    setActiveFood(null);
    setLoggedMessage(`Logged ${foodDisplayName(food)} at ${formatHour(selectedHour)}.`);
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan a barcode</Text>
      <Text style={styles.subtitle}>Point the camera at a packaged food and its nutrition facts pop up, ready to log.</Text>

      <HourPicker selectedHour={selectedHour} onSelectHour={setSelectedHour} />

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
    fill: { flex: 1 },
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    loggedMessage: { color: colors.success, fontWeight: '700', textAlign: 'center' },
  });
