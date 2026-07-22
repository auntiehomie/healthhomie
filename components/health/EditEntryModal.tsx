import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { HourPicker } from './HourPicker';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { deriveMealType } from '@/lib/domain/mealType';
import { scaleMacros } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import type { FoodItem, MealEntry } from '@/types/healthhomie';

/** Keyed by entry.id from the caller so switching entries remounts this with fresh state. */
export function EditEntryModal({
  entry,
  food,
  onClose,
  onSave,
}: {
  entry: MealEntry | null;
  food: FoodItem | undefined;
  onClose: () => void;
  onSave: (updated: Pick<MealEntry, 'id' | 'servings' | 'hour' | 'mealType'>) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hour, setHour] = useState(entry?.hour ?? new Date().getHours());
  const [servingsText, setServingsText] = useState(entry ? String(entry.servings) : '1');
  const [favorite, setFavorite] = useState(() => food?.favorite ?? false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  if (!entry) return null;

  const servings = Number(servingsText);
  const valid = Number.isFinite(servings) && servings > 0;
  const macros = valid && food ? scaleMacros(food, servings) : null;

  async function toggleFavorite() {
    if (!food || savingFavorite) return;
    const next = !favorite;
    setFavorite(next);
    setSavingFavorite(true);
    try {
      await upsertFoodItem({ ...food, favorite: next, updatedAt: new Date().toISOString() });
    } catch {
      setFavorite(!next);
    } finally {
      setSavingFavorite(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.titleText]}>{food ? foodDisplayName(food) : 'Edit entry'}</Text>
            {food && (
              <Pressable accessibilityLabel={favorite ? 'Remove from quick add' : 'Save for quick add'} onPress={toggleFavorite} style={styles.favoriteButton}>
                <Text style={styles.favoriteIcon}>{favorite ? '⭐' : '☆'}</Text>
              </Pressable>
            )}
          </View>

          <HourPicker selectedHour={hour} onSelectHour={setHour} />

          <Text style={styles.label}>Servings</Text>
          <TextInput
            value={servingsText}
            onChangeText={setServingsText}
            keyboardType="decimal-pad"
            style={[styles.amountInput, !valid && styles.amountInputInvalid]}
          />
          {!valid && <Text style={styles.error}>Enter an amount greater than zero.</Text>}

          {macros && (
            <View style={styles.macroGrid}>
              <MacroStat label="Calories" value={`${Math.round(macros.calories)}`} colors={colors} />
              <MacroStat label="Protein" value={`${Math.round(macros.proteinG)}g`} colors={colors} />
              <MacroStat label="Carbs" value={`${Math.round(macros.carbsG)}g`} colors={colors} />
              <MacroStat label="Fat" value={`${Math.round(macros.fatG)}g`} colors={colors} />
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton, !valid && styles.buttonDisabled]}
              disabled={!valid}
              onPress={() => onSave({ id: entry.id, servings, hour, mealType: deriveMealType(hour) })}
            >
              <Text style={styles.confirmButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
    title: { ...typography.title2, color: colors.text },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titleText: { flex: 1 },
    favoriteButton: { padding: 4 },
    favoriteIcon: { fontSize: 26 },
    label: { color: colors.text, fontWeight: '800' },
    amountInput: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 20, fontWeight: '700', color: colors.text },
    amountInputInvalid: { borderWidth: 2, borderColor: colors.danger },
    error: { color: colors.danger, fontWeight: '600' },
    macroGrid: { flexDirection: 'row', gap: 10 },
    macroStat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
    macroValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    macroLabel: { fontSize: 12, color: colors.textMuted },
    actionRow: { flexDirection: 'row', gap: 12 },
    button: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    cancelButton: { backgroundColor: colors.chipBackground },
    cancelButtonText: { color: colors.chipText, fontWeight: '800' },
    confirmButton: { backgroundColor: colors.primary },
    buttonDisabled: { opacity: 0.5 },
    confirmButtonText: { color: colors.onPrimary, fontWeight: '800' },
  });
