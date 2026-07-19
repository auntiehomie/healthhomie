import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { EditEntryModal } from '@/components/health/EditEntryModal';
import { HourPicker } from '@/components/health/HourPicker';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { addMealEntry, createId, deleteMealEntry, listFoodItems, listMealEntries, updateMealEntry, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType, formatHour } from '@/lib/domain/mealType';
import { formatDateLabel, formatWeekRangeLabel, shiftDateKey, summarizeDay, todayKey, weekDateKeys, weekStartKey } from '@/lib/domain/nutrition';
import {
  findClosestRestaurantMatch,
  getRestaurantFoodItem,
  searchRestaurantFoods,
  searchUsdaFoods,
  type RestaurantMenuItemSummary,
} from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { ChevronLeft, ChevronRight, ScanBarcode, Trash2, X } from 'lucide-react-native';
import type { FoodItem, MealEntry } from '@/types/healthhomie';

export default function JournalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekStart, setWeekStart] = useState<string>(weekStartKey(todayKey()));
  const [weekEntries, setWeekEntries] = useState<MealEntry[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(new Date().getHours());
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<RestaurantMenuItemSummary[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [aiMatching, setAiMatching] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const load = useCallback(async () => {
    const [nextFoods, nextEntries] = await Promise.all([listFoodItems(), listMealEntries(selectedDate)]);
    setFoods(nextFoods);
    setEntries(nextEntries);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => { load().catch(console.warn); }, [load]));
  const summary = useMemo(() => summarizeDay(selectedDate, entries, foods), [entries, foods, selectedDate]);
  const isToday = selectedDate === todayKey();

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    try {
      const [nextFoods, allEntries] = await Promise.all([listFoodItems(), listMealEntries()]);
      setFoods(nextFoods);
      setWeekEntries(allEntries);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    if (viewMode === 'week') loadWeek().catch(console.warn);
  }, [viewMode, loadWeek]));

  const weekDays = useMemo(() => weekDateKeys(weekStart), [weekStart]);
  const weekDaySummaries = useMemo(
    () => weekDays.map((date) => summarizeDay(date, weekEntries, foods)),
    [weekDays, weekEntries, foods]
  );
  const weekTotal = useMemo(
    () => weekDaySummaries.reduce((total, day) => ({
      calories: total.calories + day.calories,
      proteinG: total.proteinG + day.proteinG,
      carbsG: total.carbsG + day.carbsG,
      fatG: total.fatG + day.fatG,
    }), { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }),
    [weekDaySummaries]
  );
  const isThisWeek = weekStart === weekStartKey(todayKey());

  function openDay(date: string) {
    setSelectedDate(date);
    setViewMode('day');
  }

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
      date: selectedDate,
      servings,
      createdAt: new Date().toISOString(),
    });
    setActiveFood(null);
    setResults([]);
    setRestaurantResults([]);
    setAiNote(null);
    setQuery('');
    await load();
  }

  async function saveEntryEdit(updated: Pick<MealEntry, 'id' | 'servings' | 'hour' | 'mealType'>) {
    try {
      await updateMealEntry(updated);
      setEditingEntry(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      if (Platform.OS === 'web') window.alert(`Couldn’t update entry: ${message}`);
      else Alert.alert('Couldn’t update entry', message);
    }
  }

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setAiNote(null);
    const [usda, restaurants] = await Promise.allSettled([searchUsdaFoods(query), searchRestaurantFoods(query)]);
    setResults(usda.status === 'fulfilled' ? usda.value : []);
    setRestaurantResults(restaurants.status === 'fulfilled' ? restaurants.value : []);
    if (usda.status === 'rejected' && restaurants.status === 'rejected') {
      setSearchError(usda.reason instanceof Error ? usda.reason.message : 'Search failed. Try again in a moment.');
    } else if (usda.status === 'rejected') {
      setSearchError(usda.reason instanceof Error ? usda.reason.message : 'USDA search failed.');
    } else if (restaurants.status === 'rejected') {
      setSearchError(restaurants.reason instanceof Error ? restaurants.reason.message : 'Restaurant search failed.');
    }
    setSearching(false);
  }

  async function selectRestaurantItem(item: RestaurantMenuItemSummary) {
    setLoadingItemId(item.id);
    setSearchError(null);
    try {
      setActiveFood(await getRestaurantFoodItem(item.id));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Couldn't load that item. Try again.");
    } finally {
      setLoadingItemId(null);
    }
  }

  async function askAiForMatch() {
    if (restaurantResults.length === 0) return;
    setAiMatching(true);
    setAiNote(null);
    try {
      const result = await findClosestRestaurantMatch(query, restaurantResults);
      setAiNote(result.note);
      const match = result.bestMatchId != null ? restaurantResults.find((r) => r.id === result.bestMatchId) : undefined;
      if (match) await selectRestaurantItem(match);
    } catch (error) {
      setAiNote(error instanceof Error ? error.message : "Couldn't reach AI matching. Try again.");
    } finally {
      setAiMatching(false);
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

      <View style={styles.viewToggleRow}>
        <Pressable style={[styles.viewToggle, viewMode === 'day' && styles.viewToggleActive]} onPress={() => setViewMode('day')}>
          <Text style={[styles.viewToggleText, viewMode === 'day' && styles.viewToggleTextActive]}>Day</Text>
        </Pressable>
        <Pressable style={[styles.viewToggle, viewMode === 'week' && styles.viewToggleActive]} onPress={() => setViewMode('week')}>
          <Text style={[styles.viewToggleText, viewMode === 'week' && styles.viewToggleTextActive]}>Week</Text>
        </Pressable>
      </View>

      {viewMode === 'week' ? (
        <>
          <View style={styles.dateRow}>
            <Pressable accessibilityLabel="Previous week" hitSlop={8} onPress={() => setWeekStart((w) => shiftDateKey(w, -7))} style={styles.dateArrow}>
              <ChevronLeft color={colors.text} size={20} />
            </Pressable>
            <Text style={styles.dateLabel}>{isThisWeek ? 'This week' : formatWeekRangeLabel(weekStart)}</Text>
            <Pressable
              accessibilityLabel="Next week"
              hitSlop={8}
              disabled={isThisWeek}
              onPress={() => setWeekStart((w) => shiftDateKey(w, 7))}
              style={[styles.dateArrow, isThisWeek && styles.dateArrowDisabled]}
            >
              <ChevronRight color={isThisWeek ? colors.textMuted : colors.text} size={20} />
            </Pressable>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryValue}>{Math.round(weekTotal.calories)} kcal total</Text>
            <Text style={styles.summaryText}>{Math.round(weekTotal.proteinG)}g protein · {Math.round(weekTotal.carbsG)}g carbs · {Math.round(weekTotal.fatG)}g fat</Text>
          </View>

          {weekLoading && <ActivityIndicator color={colors.primary} />}

          {weekDays.map((date, i) => {
            const day = weekDaySummaries[i];
            const isFuture = date > todayKey();
            return (
              <Pressable key={date} onPress={() => openDay(date)} disabled={isFuture} style={[styles.weekDayRow, isFuture && styles.weekDayRowFuture]}>
                <View>
                  <Text style={styles.weekDayLabel}>{formatDateLabel(date)}</Text>
                  <Text style={styles.foodMeta}>{day.entries} entr{day.entries === 1 ? 'y' : 'ies'}</Text>
                </View>
                <Text style={styles.foodMacros}>{isFuture ? '—' : `${Math.round(day.calories)} kcal`}</Text>
              </Pressable>
            );
          })}
        </>
      ) : (
        <>
      <View style={styles.dateRow}>
        <Pressable accessibilityLabel="Previous day" hitSlop={8} onPress={() => setSelectedDate((d) => shiftDateKey(d, -1))} style={styles.dateArrow}>
          <ChevronLeft color={colors.text} size={20} />
        </Pressable>
        <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
        <Pressable
          accessibilityLabel="Next day"
          hitSlop={8}
          disabled={isToday}
          onPress={() => setSelectedDate((d) => shiftDateKey(d, 1))}
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
        >
          <ChevronRight color={isToday ? colors.textMuted : colors.text} size={20} />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryValue}>{Math.round(summary.calories)} kcal</Text>
        <Text style={styles.summaryText}>{Math.round(summary.proteinG)}g protein · {Math.round(summary.carbsG)}g carbs · {Math.round(summary.fatG)}g fat</Text>
      </View>

      <HourPicker selectedHour={selectedHour} onSelectHour={setSelectedHour} />

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

      {restaurantResults.length > 0 && <Text style={styles.resultsLabel}>Restaurants</Text>}
      {restaurantResults.slice(0, 3).map((item) => (
        <Pressable key={item.id} onPress={() => selectRestaurantItem(item)} disabled={loadingItemId !== null} style={styles.foodRow}>
          <View>
            <Text style={styles.foodName}>{item.title}</Text>
            <Text style={styles.foodMeta}>{item.restaurantChain}</Text>
          </View>
          {loadingItemId === item.id ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.foodMacros}>Tap for nutrition</Text>}
        </Pressable>
      ))}
      {restaurantResults.length > 3 && (
        <Pressable
          style={styles.seeMoreButton}
          onPress={() => router.push({ pathname: '/restaurant-results', params: { q: query, hour: String(selectedHour), date: selectedDate } })}
        >
          <Text style={styles.seeMoreButtonText}>See more restaurant results →</Text>
        </Pressable>
      )}
      {restaurantResults.length > 0 && (
        <Pressable style={styles.aiMatchLink} onPress={askAiForMatch} disabled={aiMatching}>
          {aiMatching ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.aiMatchLinkText}>🤖 Can’t find it? Ask AI for the closest match</Text>
          )}
        </Pressable>
      )}
      {aiNote && <Text style={styles.aiNote}>{aiNote}</Text>}

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

      <Text style={styles.label}>{isToday ? 'Today’s entries' : `${formatDateLabel(selectedDate)}’s entries`}</Text>
      {entries.length === 0 ? <Text style={styles.empty}>Nothing logged {isToday ? 'yet' : 'for this day'}. Search for a food above to start.</Text> : entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodItemId);
        const foodName = food ? foodDisplayName(food) : 'Food';
        return (
          <Pressable key={entry.id} onPress={() => setEditingEntry(entry)} style={styles.entryRow}>
            <View style={styles.entryDetails}>
              <Text style={styles.entryName}>{foodName}</Text>
              <Text style={styles.entryMeta}>{entry.hour != null ? formatHour(entry.hour) : entry.mealType} · {entry.servings} serving{entry.servings === 1 ? '' : 's'}</Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${foodName} from today’s journal`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={(event) => { event.stopPropagation(); confirmDelete(entry, foodName); }}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}>
              <Trash2 color={colors.danger} size={20} />
            </Pressable>
          </Pressable>
        );
      })}
        </>
      )}

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={logFood} />

      <EditEntryModal
        key={editingEntry?.id}
        entry={editingEntry}
        food={foods.find((item) => item.id === editingEntry?.foodItemId)}
        onClose={() => setEditingEntry(null)}
        onSave={saveEntryEdit}
      />

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
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    viewToggleRow: { flexDirection: 'row', gap: 8, backgroundColor: colors.chipBackground, borderRadius: 14, padding: 4 },
    viewToggle: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    viewToggleActive: { backgroundColor: colors.primary },
    viewToggleText: { color: colors.chipText, fontWeight: '700' },
    viewToggleTextActive: { color: colors.onPrimary },
    weekDayRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    weekDayRowFuture: { opacity: 0.5 },
    weekDayLabel: { fontWeight: '800', color: colors.text, fontSize: 16 },
    dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    dateArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.chipBackground, alignItems: 'center', justifyContent: 'center' },
    dateArrowDisabled: { opacity: 0.4 },
    dateLabel: { color: colors.text, fontWeight: '800', fontSize: 16, minWidth: 120, textAlign: 'center' },
    summary: { backgroundColor: colors.text, borderRadius: 24, padding: 18 },
    summaryValue: { color: colors.background, fontSize: 30, fontWeight: '900' },
    summaryText: { color: colors.background, opacity: 0.75 },
    label: { color: colors.text, fontWeight: '800', marginTop: 8 },
    resultsLabel: { color: colors.textMuted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
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
    seeMoreButton: { alignItems: 'center', paddingVertical: 10 },
    seeMoreButtonText: { color: colors.primary, fontWeight: '700' },
    aiMatchLink: { alignItems: 'center', paddingVertical: 6 },
    aiMatchLinkText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    aiNote: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
    entryRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    entryDetails: { flex: 1, gap: 4 },
    entryName: { color: colors.text, fontSize: 16, fontWeight: '800' },
    entryMeta: { color: colors.textMuted, textTransform: 'capitalize' },
    deleteButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    deleteButtonPressed: { opacity: 0.65 },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
  });
