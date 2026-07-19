import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { HealthPage } from '@/components/home/HealthPage';
import { ProductivityPage } from '@/components/home/ProductivityPage';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

const PAGES = [
  { key: 'productivity', label: 'Productivity' },
  { key: 'health', label: 'Health' },
] as const;

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPage = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveIndex(index);
  }, [width]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }, [width]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.switcher}>
        {PAGES.map((page, index) => (
          <Pressable
            key={page.key}
            onPress={() => goToPage(index)}
            style={[styles.switchBtn, activeIndex === index && styles.switchBtnActive]}
          >
            <Text style={[styles.switchText, activeIndex === index && styles.switchTextActive]}>{page.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
      >
        <View style={{ width, flex: 1 }}>
          <ProductivityPage />
        </View>
        <View style={{ width, flex: 1 }}>
          <HealthPage />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: colors.background },
    switcher: { flexDirection: 'row', gap: 8, padding: 12 },
    switchBtn: { flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.chipBackground },
    switchBtnActive: { backgroundColor: colors.primary },
    switchText: { color: colors.chipText, fontWeight: '700' },
    switchTextActive: { color: colors.onPrimary },
    pager: { flex: 1 },
  });
