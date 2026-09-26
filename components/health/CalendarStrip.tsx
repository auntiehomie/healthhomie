import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { todayKey } from '@/lib/domain/nutrition';

export type DayIndicatorType = 'food' | 'exercise' | 'mood' | 'weight';

export type DayCompliance = {
  date: string;
  indicators: DayIndicatorType[];
};

export function CalendarStrip({
  days,
  onDayPress,
  currentDate = todayKey(),
}: {
  days: DayCompliance[];
  onDayPress: (date: string) => void;
  currentDate?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [mounted, setMounted] = useState(false);

  // Scroll to today on mount
  const onLayout = useCallback(() => {
    if (mounted) return;
    setMounted(true);
    // Small delay to ensure layout is complete
    setTimeout(() => {
      const todayIndex = days.findIndex((d) => d.date === currentDate);
      if (todayIndex > 0 && scrollRef.current) {
        scrollRef.current.scrollTo({ x: todayIndex * 56 - 40, animated: false });
      }
    }, 100);
  }, [days, currentDate, mounted]);

  const today = currentDate;

  const indicatorColor = (type: DayIndicatorType, _colors: ThemeColors): string => {
    switch (type) {
      case 'food': return '#22c55e';
      case 'exercise': return '#3b82f6';
      case 'mood': return '#f59e0b';
      case 'weight': return '#8b5cf6';
    }
  };

  const { width: screenWidth } = useWindowDimensions();

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: screenWidth * 0.05 }]}
      >
        {days.map((day) => {
          const isToday = day.date === today;
          const dateObj = new Date(`${day.date}T00:00:00`);
          const dayNum = dateObj.getDate();
          const dayName = dateObj.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);

          return (
            <Pressable
              key={day.date}
              style={[styles.dayCell, isToday && styles.dayCellToday]}
              onPress={() => onDayPress(day.date)}
            >
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
              <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
              <View style={styles.indicatorRow}>
                {day.indicators.length > 0 ? (
                  day.indicators.map((type, i) => (
                    <View
                      key={type}
                      style={[
                        styles.indicator,
                        { backgroundColor: indicatorColor(type, colors), marginLeft: i > 0 ? 2 : 0 },
                      ]}
                    />
                  ))
                ) : (
                  <View style={styles.indicatorPlaceholder} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 10,
    },
    scroll: {
      gap: 4,
      alignItems: 'center',
    },
    dayCell: {
      width: 52,
      paddingVertical: 8,
      borderRadius: 16,
      alignItems: 'center',
      gap: 2,
    },
    dayCellToday: {
      backgroundColor: colors.primary,
    },
    dayName: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    dayNameToday: {
      color: colors.onPrimary,
    },
    dayNum: {
      ...typography.title2,
      color: colors.text,
    },
    dayNumToday: {
      color: colors.onPrimary,
    },
    indicatorRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      height: 8,
      gap: 2,
      marginTop: 2,
    },
    indicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    indicatorPlaceholder: {
      width: 6,
      height: 6,
    },
  });