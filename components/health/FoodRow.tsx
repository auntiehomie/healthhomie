import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

/** Shared tappable row for a food/menu-item result: title + meta on the left, a trailing label
 * (kcal, "Tap for nutrition") or loading spinner on the right. Was independently copy-pasted
 * into Journal, restaurant results, and the recipe editor - consolidated here so a layout fix
 * (like the text-wrapping fix this row previously needed) only has to be made once. */
export function FoodRow({
  title,
  meta,
  rightLabel,
  loading,
  onPress,
  disabled,
}: {
  title: string;
  meta: string;
  rightLabel?: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.foodRow}>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{title}</Text>
        <Text style={styles.foodMeta}>{meta}</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.primary} /> : rightLabel ? <Text style={styles.foodMacros}>{rightLabel}</Text> : null}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    foodRow: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    foodInfo: { flex: 1, marginRight: 12 },
    foodName: { fontWeight: '800', color: colors.text, fontSize: 16, flexWrap: 'wrap' },
    foodMeta: { color: colors.textMuted, marginTop: 4 },
    foodMacros: { fontWeight: '800', color: colors.primary, flexShrink: 0 },
  });
