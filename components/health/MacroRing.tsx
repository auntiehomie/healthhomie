import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export function MacroRing({ label, actual, target, color }: { label: string; actual: number; target: number; color: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pct = Math.min(100, Math.round((actual / Math.max(target, 1)) * 100));
  return (
    <View style={styles.container}>
      <View style={[styles.ring, { borderColor: color }]}>
        <Text style={styles.percent}>{pct}%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{Math.round(actual)} / {Math.round(target)}g</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { alignItems: 'center', gap: 6, flex: 1 },
    ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    percent: { fontWeight: '800', color: colors.text },
    label: { color: colors.text, fontWeight: '700' },
    value: { color: colors.textMuted, fontSize: 12 },
  });
