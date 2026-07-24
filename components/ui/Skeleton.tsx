import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { cardShadow } from '@/lib/theme/shadow';

/** A single pulsing placeholder block, for content that hasn't loaded yet. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: colors.surfaceAlt, borderRadius: 6, opacity }, style]} />;
}

/** Placeholder shaped like a FoodRow, for search results that are still in flight. */
export function FoodRowSkeleton() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Skeleton style={styles.title} />
        <Skeleton style={styles.meta} />
      </View>
      <Skeleton style={styles.trailing} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...cardShadow },
    info: { flex: 1, marginRight: 12, gap: 8 },
    title: { height: 16, width: '70%' },
    meta: { height: 12, width: '45%' },
    trailing: { height: 14, width: 48 },
  });
