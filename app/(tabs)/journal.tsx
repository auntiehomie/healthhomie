import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, deleteMealEntry, listFoodItems, listMealEntries, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType, formatHour, HOURS } from '@/lib/domain/mealType';
import { summarizeDay, todayKey } from '@/lib/domain/nutrition';
import { searchUsdaFoods } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { ScanBarcode, Trash2, X } from 'lucide-react-native';
import type { FoodItem, MealEntry } from '@/types/healthhomie';

const HOUR_CHIP_WIDTH = 64;

export default function JournalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const hourScrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const [nextFoods, nextEntries] = await Promise.all([listFoodItems(), listMealEntries(todayKey())]);
    setFoods(nextFoods);
    setEntries(nextEntries);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(console.warn); }, [load]));
  const summary = useMemo(() => summarizeDay(todayKey(), entries, foods), [entries, foods]);

  // Foods you've already scanned/searched/logged before, plus saved recipes (source: 'custom') —
  // searched locally so recipes are actually reachable when logging, not just saved and forgotten.
  const myFoodMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return foods.filter((food) => food.name.toLowerCase().includes(q) || food.brand?.toLowerCase().includes(q)).slice(0, 8);
  }, [foods, query]);

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
    setResults([]);
    setQuery('');
    await load();
  }

  function scrollToSelectedHour() {
    hourScrollRef.current?.scrollTo({ x: Math.max(0, (selectedHour - 2) * HOUR_CHIP_WIDTH), animated: false });
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

  async function removeEntry(entry: MealEntry) {
    try {
      await deleteMealEntry(entry.id);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (Platform.OS === 'web') window.alert(`Couldn’t delete entry: ${message}`);
      else Alert.alert('Couldn’t delete entry', message);
    }
  }

  function confirmDelete(entry: MealEntry, foodName: string) {
    const message = `${foodName} will be removed from today’s journal and totals.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete food entry?

${message}`)) void removeEntry(entry);
      return;
    }

    Alert.alert('Delete food entry?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeEntry(entry) },
    ]);
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Food journal</Text>
      <Text style={styles.subtitle}>Search USDA foods or tap a saved food to log it.</Text>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{Math.round(summary.calories)} kcal</Text>
        <Text style={styles.summaryText}>{Math.round(summary.proteinG)}g protein · {Math.round(summary.carbsG)}g carbs · {Math.round(summary.fatG)}g fat</Text>
      </View>

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
          {searching ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.searchButtonText}>Search</Text>}
        </Pressable>
        <Pressable accessibilityLabel="Scan a barcode" style={styles.scanButton} onPress={() => setScannerOpen(true)}>
          <ScanBarcode color={colors.onPrimary} size={20} />
        </Pressable>
      </View>
      {searchError && <Text style={styles.error}>{searchError}</Text>}

      {myFoodMatches.length > 0 && (
        <>
          <Text style={styles.resultsLabel}>My foods & recipes</Text>
          {myFoodMatches.map((food) => (
            <Pressable key={food.id} onPress={() => setActiveFood(food)} style={styles.foodRow}>
              <View>
                <Text style={styles.foodName}>{foodDisplayName(food)}</Text>
                <Text style={styles.foodMeta}>{food.servingSize}{food.servingUnit} · {food.id.startsWith('recipe-') ? 'recipe' : food.source}</Text>
              </View>
              <Text style={styles.foodMacros}>{Math.round(food.calories)} kcal</Text>
            </Pressable>
          ))}
        </>
      )}

      {results.length > 0 && <Text style={styles.resultsLabel}>USDA results</Text>}
      {results.map((food) => (
        <Pressable key={food.id} onPress={() => setActiveFood(food)} style={styles.foodRow}>
          <View>
            <Text style={styles.foodName}>{foodDisplayName(food)}</Text>
            <Text style={styles.foodMeta}>{food.servingSize}{food.servingUnit} · {food.source}</Text>
          </View>
          <Text style={styles.foodMacros}>{Math.round(food.calories)} kcal</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>Today’s entries</Text>
      {entries.length === 0 ? <Text style={styles.empty}>Nothing logged yet. Search for a food above to start.</Text> : entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodItemId);
        const foodName = food ? foodDisplayName(food) : 'Food';
        return (
          <View key={entry.id} style={styles.entryRow}>
            <View style={styles.entryDetails}>
              <Text style={styles.entryName}>{foodName}</Text>
              <Text style={styles.entryMeta}>{entry.hour != null ? formatHour(entry.hour) : entry.mealType} · {entry.servings} serving{entry.servings === 1 ? '' : 's'}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${foodName} from today’s journal`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => confirmDelete(entry, foodName)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}>
              <Trash2 color={colors.danger} size={20} />
            </Pressable>
          </View>
        );
      })}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} />

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerScreen}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan a barcode</Text>
            <Pressable accessibilityLabel="Close scanner" hitSlop={8} onPress={() => setScannerOpen(false)}>
              <X color={colors.text} size={24} />
            </Pressable>
          </View>
          <BarcodeScanner
            onFound={(food) => {
              setScannerOpen(false);
              setActiveFood(food);
            }}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    summary: { backgroundColor: colors.text, borderRadius: 24, padding: 18 },
    summaryValue: { color: colors.background, fontSize: 30, fontWeight: '900' },
    summaryText: { color: colors.background, opacity: 0.75 },
    label: { color: colors.text, fontWeight: '800', marginTop: 8 },
    resultsLabel: { color: colors.textMuted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
    hourScroll: { flexGrow: 0 },
    hourRow: { flexDirection: 'row', gap: 8 },
    hourChip: { width: HOUR_CHIP_WIDTH, alignItems: 'center' },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.chipBackground },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '700' },
    chipTextActive: { color: colors.onPrimary },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 18, color: colors.text },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    searchInput: { flex: 1, minWidth: 0 },
    searchButton: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    searchButtonText: { color: colors.onPrimary, fontWeight: '800' },
    scanButton: { backgroundColor: colors.primary, borderRadius: 16, width: 52, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    scannerScreen: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60, gap: 16 },
    scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scannerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
    error: { color: colors.danger, fontWeight: '600' },
    foodRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    foodName: { fontWeight: '800', color: colors.text, fontSize: 16 },
    foodMeta: { color: colors.textMuted, marginTop: 4 },
    foodMacros: { fontWeight: '800', color: colors.primary },
    entryRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    entryDetails: { flex: 1, gap: 4 },
    entryName: { color: colors.text, fontSize: 16, fontWeight: '800' },
    entryMeta: { color: colors.textMuted, textTransform: 'capitalize' },
    deleteButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    deleteButtonPressed: { opacity: 0.65 },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
  });
