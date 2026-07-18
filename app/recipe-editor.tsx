import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScanBarcode, X } from 'lucide-react-native';
import { BarcodeScanner } from '@/components/health/BarcodeScanner';
import { LogFoodModal } from '@/components/health/LogFoodModal';
import { listRecipes, saveRecipe, upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { recipePerServing, recipeTotals } from '@/lib/domain/recipes';
import { searchUsdaFoods } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { FoodItem, RecipeIngredient } from '@/types/healthhomie';

export default function RecipeEditorScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [servingsText, setServingsText] = useState('1');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [loaded, setLoaded] = useState(!isEditing);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeFood, setActiveFood] = useState<FoodItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!isEditing) return;
    let active = true;
    listRecipes().then((recipes) => {
      if (!active) return;
      const recipe = recipes.find((r) => r.id === id);
      if (recipe) {
        setName(recipe.name);
        setServingsText(String(recipe.servings));
        setIngredients(recipe.ingredients);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { active = false; };
  }, [id, isEditing]));

  const servingsYield = Number(servingsText) > 0 ? Number(servingsText) : 1;
  const totals = useMemo(() => recipeTotals(ingredients), [ingredients]);
  const perServing = useMemo(() => recipePerServing(ingredients, servingsYield), [ingredients, servingsYield]);

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchUsdaFoods(query));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function addIngredient(food: FoodItem, ingredientServings: number) {
    await upsertFoodItem(food);
    setIngredients((prev) => [...prev, { id: `${food.id}-${Date.now()}`, foodItemId: food.id, servings: ingredientServings, food }]);
    setActiveFood(null);
    setResults([]);
    setQuery('');
  }

  function removeIngredient(ingredientId: string) {
    setIngredients((prev) => prev.filter((ing) => ing.id !== ingredientId));
  }

  async function handleSave() {
    if (!name.trim()) return setError('Give the recipe a name.');
    if (ingredients.length === 0) return setError('Add at least one ingredient.');
    setSaving(true);
    setError(null);
    try {
      await saveRecipe({
        id: typeof id === 'string' ? id : undefined,
        name: name.trim(),
        servings: servingsYield,
        ingredients: ingredients.map((ing) => ({ foodItemId: ing.foodItemId, servings: ing.servings })),
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return (
    <View style={[styles.container, styles.centerFill]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isEditing ? 'Edit recipe' : 'New recipe'}</Text>

      <TextInput
        placeholder="Recipe name"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        style={styles.nameInput}
      />

      <View style={styles.yieldRow}>
        <Text style={styles.label}>Makes</Text>
        <TextInput
          keyboardType="decimal-pad"
          value={servingsText}
          onChangeText={setServingsText}
          style={styles.yieldInput}
        />
        <Text style={styles.label}>serving{servingsYield === 1 ? '' : 's'}</Text>
      </View>

      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Per serving</Text>
        <View style={styles.macroGrid}>
          <MacroStat label="Calories" value={`${Math.round(perServing.calories)}`} colors={colors} />
          <MacroStat label="Protein" value={`${Math.round(perServing.proteinG)}g`} colors={colors} />
          <MacroStat label="Carbs" value={`${Math.round(perServing.carbsG)}g`} colors={colors} />
          <MacroStat label="Fat" value={`${Math.round(perServing.fatG)}g`} colors={colors} />
        </View>
        <Text style={styles.totalsSubtitle}>
          Whole recipe: {Math.round(totals.calories)} kcal · {Math.round(totals.proteinG)}g protein · {Math.round(totals.carbsG)}g carbs · {Math.round(totals.fatG)}g fat
        </Text>
      </View>

      <Text style={styles.label}>Ingredients</Text>
      {ingredients.length === 0 && <Text style={styles.empty}>No ingredients yet — search or scan one below.</Text>}
      {ingredients.map((ing) => (
        <View key={ing.id} style={styles.ingredientRow}>
          <View style={styles.ingredientInfo}>
            <Text style={styles.ingredientName}>{ing.food ? foodDisplayName(ing.food) : 'Food'}</Text>
            <Text style={styles.ingredientMeta}>
              {ing.servings} × {ing.food?.servingSize}{ing.food?.servingUnit} · {ing.food ? Math.round(ing.food.calories * ing.servings) : 0} kcal
            </Text>
          </View>
          <Pressable accessibilityLabel={`Remove ${ing.food ? foodDisplayName(ing.food) : 'ingredient'}`} onPress={() => removeIngredient(ing.id)} hitSlop={8}>
            <X color={colors.danger} size={20} />
          </Pressable>
        </View>
      ))}

      <Text style={styles.label}>Add an ingredient</Text>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          placeholder="e.g. chicken breast"
          placeholderTextColor={colors.textMuted}
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
      {results.map((food) => (
        <Pressable key={food.id} onPress={() => setActiveFood(food)} style={styles.foodRow}>
          <View>
            <Text style={styles.foodName}>{foodDisplayName(food)}</Text>
            <Text style={styles.foodMeta}>{food.servingSize}{food.servingUnit} · {food.source}</Text>
          </View>
          <Text style={styles.foodMacros}>{Math.round(food.calories)} kcal</Text>
        </Pressable>
      ))}

      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save recipe'}</Text>
      </Pressable>

      <LogFoodModal key={activeFood?.id} food={activeFood} onClose={() => setActiveFood(null)} onConfirm={addIngredient} />

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

function MacroStat({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.macroStat}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, gap: 14, backgroundColor: colors.background, paddingBottom: 60 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: '900', color: colors.text },
    nameInput: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 18, fontWeight: '700', color: colors.text },
    yieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    label: { color: colors.text, fontWeight: '800', marginTop: 4 },
    yieldInput: { backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: colors.text, width: 70, textAlign: 'center' },
    totalsCard: { backgroundColor: colors.surfaceAlt, borderRadius: 20, padding: 16, gap: 10 },
    totalsTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
    totalsSubtitle: { color: colors.textMuted, fontSize: 12 },
    macroGrid: { flexDirection: 'row', gap: 10 },
    macroStat: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 10, alignItems: 'center', gap: 2 },
    macroValue: { fontSize: 16, fontWeight: '800', color: colors.text },
    macroLabel: { fontSize: 11, color: colors.textMuted },
    empty: { color: colors.textMuted, fontStyle: 'italic' },
    ingredientRow: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ingredientInfo: { flex: 1, gap: 2 },
    ingredientName: { color: colors.text, fontWeight: '700', fontSize: 15 },
    ingredientMeta: { color: colors.textMuted, fontSize: 12 },
    searchRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 16, color: colors.text },
    searchInput: { flex: 1, minWidth: 0 },
    searchButton: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    searchButtonText: { color: colors.onPrimary, fontWeight: '800' },
    scanButton: { backgroundColor: colors.primary, borderRadius: 16, width: 52, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    error: { color: colors.danger, fontWeight: '600' },
    foodRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    foodName: { fontWeight: '800', color: colors.text, fontSize: 16 },
    foodMeta: { color: colors.textMuted, marginTop: 4 },
    foodMacros: { fontWeight: '800', color: colors.primary },
    saveButton: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
    scannerScreen: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60, gap: 16 },
    scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    scannerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  });
