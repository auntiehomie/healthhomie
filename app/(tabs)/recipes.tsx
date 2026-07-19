import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { Trash2 } from 'lucide-react-native';
import { deleteRecipe, listRecipes } from '@/lib/db/database';
import { recipePerServing } from '@/lib/domain/recipes';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { Recipe } from '@/types/healthhomie';

export default function RecipesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRecipes(await listRecipes());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function removeRecipe(recipe: Recipe) {
    try {
      await deleteRecipe(recipe.id);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.';
      if (Platform.OS === 'web') window.alert(`Couldn’t delete recipe: ${message}`);
      else Alert.alert('Couldn’t delete recipe', message);
    }
  }

  function confirmDelete(recipe: Recipe) {
    const message = `"${recipe.name}" will be permanently deleted. Meals you've already logged with it are unaffected.`;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete recipe?\n\n${message}`)) void removeRecipe(recipe);
      return;
    }
    Alert.alert('Delete recipe?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void removeRecipe(recipe) },
    ]);
  }

  if (!loaded) return null;

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Recipes</Text>
          <Text style={styles.subtitle}>Build a recipe from ingredients, then log it like any other food.</Text>
        </View>
        <Pressable style={styles.newButton} onPress={() => router.push('/recipe-editor')}>
          <Text style={styles.newButtonText}>+ New</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {recipes.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🍲</Text>
          <Text style={styles.emptyTitle}>No recipes yet</Text>
          <Text style={styles.muted}>Tap + New to search ingredients or scan barcodes and build your first recipe.</Text>
        </View>
      )}

      {recipes.map((recipe) => {
        const perServing = recipePerServing(recipe.ingredients, recipe.servings);
        return (
          <Pressable key={recipe.id} style={styles.recipeCard} onPress={() => router.push({ pathname: '/recipe-editor', params: { id: recipe.id } })}>
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMeta}>
                {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'} · makes {recipe.servings} serving{recipe.servings === 1 ? '' : 's'}
              </Text>
              <Text style={styles.recipeMacros}>
                {Math.round(perServing.calories)} kcal/serving · {Math.round(perServing.proteinG)}g protein
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Delete ${recipe.name}`}
              hitSlop={8}
              onPress={(event) => { event.stopPropagation(); confirmDelete(recipe); }}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
            >
              <Trash2 color={colors.danger} size={20} />
            </Pressable>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 14, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20, maxWidth: 260 },
    newButton: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    newButtonText: { color: colors.onPrimary, fontWeight: '800' },
    error: { color: colors.danger, fontWeight: '600' },
    emptyState: { alignItems: 'center', padding: 40, gap: 12 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    muted: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
    recipeCard: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    recipeInfo: { flex: 1, gap: 4 },
    recipeName: { fontSize: 17, fontWeight: '800', color: colors.text },
    recipeMeta: { color: colors.textMuted, fontSize: 13 },
    recipeMacros: { color: colors.primary, fontWeight: '700', fontSize: 13 },
    deleteButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    deleteButtonPressed: { opacity: 0.65 },
  });
