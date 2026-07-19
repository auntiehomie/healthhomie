import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export function MetricCard({ label, value, helper, onPress }: { label: string; value: string; helper?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 145,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      padding: 16,
      gap: 6,
    },
    cardPressed: { opacity: 0.7 },
    label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    value: { color: colors.text, fontSize: 24, fontWeight: '800' },
    helper: { color: colors.textMuted, fontSize: 12 },
  });
