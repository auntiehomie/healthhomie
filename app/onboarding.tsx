import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

const SLIDES = [
  {
    emoji: '☀️',
    title: 'Welcome to Howdy Morning',
    body: "One app for your daily food, health, and productivity loop. Here's a 30-second tour before you dive in.",
  },
  {
    emoji: '🏠',
    title: 'Home: Productivity + Health',
    body: 'Swipe between Productivity (mood, priorities, hydration, morning routine) and Health (your Oura/Fitbit energy map plus an AI coach with daily suggestions).',
  },
  {
    emoji: '📊',
    title: 'Today',
    body: 'Calories left, macros, steps, and active calories at a glance — pulled from whatever you log and whatever health tracker you connect.',
  },
  {
    emoji: '📷',
    title: 'Journal & Scan',
    body: 'Search foods or scan a barcode to log a meal in seconds. Log by weight, volume, or just a serving count — whatever is easiest.',
  },
  {
    emoji: '📝',
    title: 'Notes',
    body: 'A simple Zettelkasten-style notes inbox with tags and search. Your Home tab notes land here automatically, tagged "daily".',
  },
  {
    emoji: '🎯',
    title: 'Goals & Settings',
    body: 'Pick a goal (lose weight, maintain, gain muscle, consistency) in Goals. Connect Oura or Fitbit and invite friends from Settings.',
  },
] as const;

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(() => {
    router.replace('/survey?onboarding=true');
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex((i) => i + 1);
  }, [finish, index, isLast, width]);

  const handleMomentumEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }, [width]);

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Pressable style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>{isLast ? 'Get started' : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: colors.background },
    skip: { position: 'absolute', top: 56, right: 20, zIndex: 1, padding: 8 },
    skipText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
    pager: { flex: 1 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    emoji: { fontSize: 64 },
    title: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center' },
    body: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
    footer: { padding: 24, gap: 20, alignItems: 'center' },
    dots: { flexDirection: 'row', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.chipBackground },
    dotActive: { backgroundColor: colors.primary, width: 20 },
    nextBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', alignSelf: 'stretch' },
    nextBtnText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  });
