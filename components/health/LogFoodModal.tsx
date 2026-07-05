import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { scaleMacros } from '@/lib/domain/nutrition';
import type { FoodItem } from '@/types/healthhomie';

const GRAMS_PER_OUNCE = 28.3495;
type MassUnit = 'g' | 'oz';

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
  const isMass = food?.servingUnit.toLowerCase() === 'g';
  const [amountText, setAmountText] = useState(() => String(food?.servingSize ?? 1));
  const [massUnit, setMassUnit] = useState<MassUnit>('g');

  if (!food) return null;

  const amount = Number(amountText);
  const valid = Number.isFinite(amount) && amount > 0;
  const grams = massUnit === 'oz' ? amount * GRAMS_PER_OUNCE : amount;
  const servings = isMass ? grams / food.servingSize : amount;
  const macros = valid ? scaleMacros(food, servings) : null;

  function toggleMassUnit(next: MassUnit) {
    if (next === massUnit || !valid) return setMassUnit(next);
    const nextAmount = next === 'oz' ? amount / GRAMS_PER_OUNCE : amount * GRAMS_PER_OUNCE;
    setAmountText(round1(nextAmount).toString());
    setMassUnit(next);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{food.name}</Text>
          <Text style={styles.subtitle}>Base: {food.servingSize}{food.servingUnit} · {Math.round(food.calories)} kcal</Text>

          <View style={styles.amountRow}>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              style={[styles.amountInput, !valid && styles.amountInputInvalid]}
            />
            {isMass ? (
              <View style={styles.unitToggle}>
                {(['g', 'oz'] as MassUnit[]).map((unit) => (
                  <Pressable key={unit} onPress={() => toggleMassUnit(unit)} style={[styles.unitChip, massUnit === unit && styles.unitChipActive]}>
                    <Text style={[styles.unitChipText, massUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.unitLabel}>× {food.servingUnit}</Text>
            )}
          </View>
          {!valid && <Text style={styles.error}>Enter an amount greater than zero.</Text>}

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

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(33,29,24,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fffaf2', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#211d18' },
  subtitle: { color: '#7a7165' },
  amountRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  amountInput: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14, fontSize: 20, fontWeight: '700' },
  amountInputInvalid: { borderWidth: 2, borderColor: '#b3423b' },
  unitToggle: { flexDirection: 'row', backgroundColor: '#f0e7da', borderRadius: 999, padding: 4, gap: 4 },
  unitChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  unitChipActive: { backgroundColor: '#4f7c59' },
  unitChipText: { color: '#665f54', fontWeight: '700' },
  unitChipTextActive: { color: '#fffaf2' },
  unitLabel: { color: '#665f54', fontWeight: '700' },
  error: { color: '#b3423b', fontWeight: '600' },
  macroGrid: { flexDirection: 'row', gap: 10 },
  macroStat: { flex: 1, backgroundColor: '#f5f0e8', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 },
  macroValue: { fontSize: 18, fontWeight: '800', color: '#211d18' },
  macroLabel: { fontSize: 12, color: '#7a7165' },
  actionRow: { flexDirection: 'row', gap: 12 },
  button: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f0e7da' },
  cancelButtonText: { color: '#665f54', fontWeight: '800' },
  confirmButton: { backgroundColor: '#4f7c59' },
  buttonDisabled: { opacity: 0.5 },
  confirmButtonText: { color: '#fffaf2', fontWeight: '800' },
});
