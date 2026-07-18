import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType, formatHour, HOURS } from '@/lib/domain/mealType';
import { todayKey } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { FoodItem } from '@/types/healthhomie';

const HOUR_CHIP_WIDTH = 64;

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [loggedMessage, setLoggedMessage] = useState<string | null>(null);
  const hourScrollRef = useRef<ScrollView>(null);

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

  function scrollToSelectedHour() {
    hourScrollRef.current?.scrollTo({ x: Math.max(0, (selectedHour - 2) * HOUR_CHIP_WIDTH), animated: false });
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Scan a barcode</Text>
      <Text style={styles.subtitle}>Point the camera at a packaged food and its nutrition facts pop up, ready to log.</Text>

      <Text style={styles.label}>Time</Text>
      <ScrollView
        ref={hourScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={scrollToSelectedHour}
        style={styles.hourScroll}
        contentContainerStyle={styles.hourRow}
      >
        {HOURS.map((hour) => (
          <Pressable key={hour} onPress={() => setSelectedHour(hour)} style={[styles.chip, styles.hourChip, selectedHour === hour && styles.chipActive]}>
            <Text style={[styles.chipText, selectedHour === hour && styles.chipTextActive]}>{formatHour(hour)}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    label: { color: colors.text, fontWeight: '800', marginTop: 4 },
    hourScroll: { flexGrow: 0 },
    hourRow: { flexDirection: 'row', gap: 8 },
    hourChip: { width: HOUR_CHIP_WIDTH, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.chipBackground },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '700' },
    chipTextActive: { color: colors.onPrimary },
    loggedMessage: { color: colors.success, fontWeight: '700', textAlign: 'center' },
  });
