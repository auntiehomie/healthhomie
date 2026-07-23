import { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { upsertFoodItem } from '@/lib/db/database';
import { foodDisplayName } from '@/lib/domain/food';
import { scaleMacros } from '@/lib/domain/nutrition';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import type { FoodItem } from '@/types/healthhomie';

const GRAMS_PER_OUNCE = 28.3495;
const ML_PER_FL_OZ = 29.5735;
type MassUnit = 'g' | 'oz';
type VolumeUnit = 'ml' | 'fl oz';
type Mode = 'unit' | 'servings';

/** Keyed by food.id from the caller so a food change remounts this with fresh state, no effect needed. */
export function LogFoodModal({
  food,
  onClose,
  onConfirm,
}: {
  food: FoodItem | null;
  onClose: () => void;
  onConfirm: (food: FoodItem, servings: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const unitLower = food?.servingUnit.toLowerCase() ?? '';
  const isMass = unitLower === 'g';
  const isVolume = unitLower === 'ml';
  // Foods without a gram/ml base (e.g. "1 bowl", "1 link") are already logged by count —
  // there's no weight to convert, so the servings-vs-unit toggle only applies to g/ml foods.
  const hasServingsToggle = isMass || isVolume;

  const [mode, setMode] = useState<Mode>('unit');
  const [amountText, setAmountText] = useState(() => String(food?.servingSize ?? 1));
  const [massUnit, setMassUnit] = useState<MassUnit>('g');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('ml');
  const [servingsText, setServingsText] = useState('1');
  const [favorite, setFavorite] = useState(() => food?.favorite ?? false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  if (!food) return null;

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

  const amount = Number(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const servingsAmount = Number(servingsText);
  const validServings = Number.isFinite(servingsAmount) && servingsAmount > 0;

  const grams = massUnit === 'oz' ? amount * GRAMS_PER_OUNCE : amount;
  const ml = volumeUnit === 'fl oz' ? amount * ML_PER_FL_OZ : amount;

  let servings: number;
  let valid: boolean;
  if (mode === 'servings' && hasServingsToggle) {
    servings = servingsAmount;
    valid = validServings;
  } else if (isMass) {
    servings = grams / food.servingSize;
    valid = validAmount;
  } else if (isVolume) {
    servings = ml / food.servingSize;
    valid = validAmount;
  } else {
    servings = amount;
    valid = validAmount;
  }
  const macros = valid ? scaleMacros(food, servings) : null;

  function toggleMassUnit(next: MassUnit) {
    if (next === massUnit || !validAmount) return setMassUnit(next);
    const nextAmount = next === 'oz' ? amount / GRAMS_PER_OUNCE : amount * GRAMS_PER_OUNCE;
    setAmountText(round1(nextAmount).toString());
    setMassUnit(next);
  }

  function toggleVolumeUnit(next: VolumeUnit) {
    if (next === volumeUnit || !validAmount) return setVolumeUnit(next);
    const nextAmount = next === 'fl oz' ? amount / ML_PER_FL_OZ : amount * ML_PER_FL_OZ;
    setAmountText(round1(nextAmount).toString());
    setVolumeUnit(next);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.titleText]}>{foodDisplayName(food)}</Text>
            <Pressable accessibilityLabel={favorite ? 'Remove from quick add' : 'Save for quick add'} onPress={toggleFavorite} style={styles.favoriteButton}>
              <Text style={styles.favoriteIcon}>{favorite ? '⭐' : '☆'}</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Base: {food.servingSize}{food.servingUnit} · {Math.round(food.calories)} kcal</Text>

          {hasServingsToggle && (
            <View style={styles.modeToggle}>
              <Pressable onPress={() => setMode('unit')} style={[styles.modeChip, mode === 'unit' && styles.modeChipActive]}>
                <Text style={[styles.modeChipText, mode === 'unit' && styles.modeChipTextActive]}>{isMass ? 'By weight' : 'By volume'}</Text>
              </Pressable>
              <Pressable onPress={() => setMode('servings')} style={[styles.modeChip, mode === 'servings' && styles.modeChipActive]}>
                <Text style={[styles.modeChipText, mode === 'servings' && styles.modeChipTextActive]}>By servings</Text>
              </Pressable>
            </View>
          )}

          {mode === 'servings' && hasServingsToggle ? (
            <>
              <View style={styles.amountRow}>
                <TextInput
                  value={servingsText}
                  onChangeText={setServingsText}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, !validServings && styles.amountInputInvalid]}
                />
                <Text style={styles.unitLabel}>× serving</Text>
              </View>
              {validServings && (
                <Text style={styles.servingsHint}>= {round1(servingsAmount * food.servingSize)}{food.servingUnit}</Text>
              )}
              {!validServings && <Text style={styles.error}>Enter an amount greater than zero.</Text>}
            </>
          ) : (
            <>
              <View style={styles.amountRow}>
                <TextInput
                  value={amountText}
                  onChangeText={setAmountText}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, !validAmount && styles.amountInputInvalid]}
                />
                {isMass ? (
                  <View style={styles.unitToggle}>
                    {(['g', 'oz'] as MassUnit[]).map((unit) => (
                      <Pressable key={unit} onPress={() => toggleMassUnit(unit)} style={[styles.unitChip, massUnit === unit && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, massUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : isVolume ? (
                  <View style={styles.unitToggle}>
                    {(['ml', 'fl oz'] as VolumeUnit[]).map((unit) => (
                      <Pressable key={unit} onPress={() => toggleVolumeUnit(unit)} style={[styles.unitChip, volumeUnit === unit && styles.unitChipActive]}>
                        <Text style={[styles.unitChipText, volumeUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.unitLabel}>× {food.servingUnit}</Text>
                )}
              </View>
              {!validAmount && <Text style={styles.error}>Enter an amount greater than zero.</Text>}
            </>
          )}

          <View style={styles.macroGrid}>
            <MacroStat label="Calories" value={macros ? `${Math.round(macros.calories)}` : '—'} />
            <MacroStat label="Protein" value={macros ? `${Math.round(macros.proteinG)}g` : '—'} />
            <MacroStat label="Carbs" value={macros ? `${Math.round(macros.carbsG)}g` : '—'} />
            <MacroStat label="Fat" value={macros ? `${Math.round(macros.fatG)}g` : '—'} />
          </View>

          <View style={styles.actionRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton, !valid && styles.buttonDisabled]}
              disabled={!valid}
              onPress={() => onConfirm(food, servings)}
            >
              <Text style={styles.confirmButtonText}>Log food</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.macroStat}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
    title: { ...typography.title2, color: colors.text },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    titleText: { flex: 1 },
    favoriteButton: { padding: 4 },
    favoriteIcon: { fontSize: 40, color: colors.primary },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    modeToggle: { flexDirection: 'row', backgroundColor: colors.chipBackground, borderRadius: 999, padding: 4, gap: 4, alignSelf: 'flex-start' },
    modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    modeChipActive: { backgroundColor: colors.primary },
    modeChipText: { color: colors.chipText, fontWeight: '700', fontSize: 13 },
    modeChipTextActive: { color: colors.onPrimary },
    amountRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    amountInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 20, fontWeight: '700', color: colors.text },
    amountInputInvalid: { borderWidth: 2, borderColor: colors.danger },
    unitToggle: { flexDirection: 'row', backgroundColor: colors.chipBackground, borderRadius: 999, padding: 4, gap: 4 },
    unitChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
    unitChipActive: { backgroundColor: colors.primary },
    unitChipText: { color: colors.chipText, fontWeight: '700' },
    unitChipTextActive: { color: colors.onPrimary },
    unitLabel: { color: colors.textMuted, fontWeight: '700' },
    servingsHint: { color: colors.textMuted, fontSize: 13 },
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
