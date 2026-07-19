import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatHour, HOURS } from '@/lib/domain/mealType';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

const HOUR_CHIP_WIDTH = 64;

export function HourPicker({ label = 'Time', selectedHour, onSelectHour }: { label?: string; selectedHour: number; onSelectHour: (hour: number) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  function scrollToSelected() {
    scrollRef.current?.scrollTo({ x: Math.max(0, (selectedHour - 2) * HOUR_CHIP_WIDTH), animated: false });
  }

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={scrollToSelected}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {HOURS.map((hour) => (
          <Pressable key={hour} onPress={() => onSelectHour(hour)} style={[styles.chip, selectedHour === hour && styles.chipActive]}>
            <Text style={[styles.chipText, selectedHour === hour && styles.chipTextActive]}>{formatHour(hour)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { gap: 8 },
    label: { color: colors.text, fontWeight: '800' },
    scroll: { flexGrow: 0 },
    row: { flexDirection: 'row', gap: 8 },
    chip: { width: HOUR_CHIP_WIDTH, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.chipBackground },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '700' },
    chipTextActive: { color: colors.onPrimary },
  });
