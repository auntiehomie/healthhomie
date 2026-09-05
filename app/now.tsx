import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useMemo } from 'react';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';

export default function NowScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentFocus = [
    {
      icon: '🔨',
      title: 'Building',
      items: [
        'Howdy Morning — health-aware daily scheduler with Oura integration',
        'Homiehouse — Farcaster-native social learning platform',
        'BankBud — bank rate comparison tool bridging TradFi and DeFi',
        'Trading Bot — modular trading platform for Arbitrum',
      ],
    },
    {
      icon: '📖',
      title: 'Learning',
      items: [
        'DeFi yield strategies and stablecoin arbitrage',
        'Health optimization through wearable data',
        'Farcaster ecosystem and social graph mechanics',
        'AI agent orchestration patterns',
      ],
    },
    {
      icon: '🎯',
      title: 'Focused On',
      items: [
        'Polishing Howdy Morning for broader release',
        'Growing the Homiehouse community',
        'Improving BankBud rate scraping coverage',
        'Building a personal brand through building in public',
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Now</Text>
      <Text style={styles.subtitle}>Last updated: September 2026</Text>

      {currentFocus.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>
            {section.icon} {section.title}
          </Text>
          {section.items.map((item, idx) => (
            <Text key={idx} style={styles.listItem}>
              • {item}
            </Text>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <Text style={styles.listItem}>Michigan, USA</Text>
      </View>

      <Text style={styles.footer}>
        This page is inspired by /now pages — a convention for sharing what you&apos;re currently focused on.
      </Text>

      <Pressable
        style={styles.linkButton}
        onPress={() => {}}
      >
        <Text style={styles.linkButtonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingBottom: 48,
    },
    heading: {
      ...typography.display2,
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      ...typography.bodyMedium,
      color: colors.textMuted,
      marginBottom: 24,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      ...typography.title2,
      color: colors.text,
      marginBottom: 12,
    },
    listItem: {
      ...typography.bodyMedium,
      color: colors.textMuted,
      marginBottom: 6,
      paddingLeft: 8,
    },
    footer: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 16,
      marginBottom: 24,
      lineHeight: 20,
    },
    linkButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    linkButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
  });
