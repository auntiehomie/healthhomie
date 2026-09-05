import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useMemo } from 'react';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';

const AFFILIATE_LINKS = [
  { brand: 'Oura Ring', url: 'https://ouraring.com', description: 'Sleep, readiness, and recovery tracking', code: 'REFERRAL_PLACEHOLDER' },
  { brand: 'Whoop', url: 'https://www.whoop.com', description: 'Continuous health monitoring and strain tracking', code: 'REFERRAL_PLACEHOLDER' },
  { brand: 'Athletic Greens', url: 'https://www.athleticgreens.com', description: 'Daily all-in-one nutritional supplement', code: 'REFERRAL_PLACEHOLDER' },
  { brand: 'Therabody', url: 'https://www.therabody.com', description: 'Massage guns and recovery tools', code: 'REFERRAL_PLACEHOLDER' },
];

const PRICING_TIERS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    features: ['Up to 25 employees', 'Basic energy dashboard', 'Monthly aggregate report', 'Email support'],
    cta: 'Get started',
  },
  {
    name: 'Team',
    price: '$5',
    period: '/employee/mo',
    features: ['Up to 500 employees', 'Anonymous team health scoring', 'Productivity correlation reports', 'Weekly energy trends', 'Priority support'],
    cta: 'Start team trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited employees', 'Custom integrations (Slack, Teams)', 'Dedicated success manager', 'Quarterly business reviews', 'SSO & SAML', 'API access'],
    cta: 'Contact sales',
  },
];

export default function B2BWellnessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Corporate Wellness</Text>
      <Text style={styles.subtitle}>
        Optimize your team&apos;s energy and productivity. Howdy Morning for Business gives you
        aggregate health insights while respecting individual privacy.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Why team energy matters</Text>
        <Text style={styles.cardText}>
          Research shows employee energy levels directly impact productivity, decision-making, and burnout rates.
          Our dashboard turns anonymous wearable data into actionable team insights — no individual health data is ever exposed.
        </Text>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>23%</Text>
            <Text style={styles.statLabel}>Productivity gain</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>41%</Text>
            <Text style={styles.statLabel}>Less burnout</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>3.2x</Text>
            <Text style={styles.statLabel}>ROI</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pricing</Text>
        <Text style={styles.cardText}>Transparent pricing that scales with your team.</Text>
        {PRICING_TIERS.map((tier) => (
          <View key={tier.name} style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>{tier.price}<Text style={styles.tierPeriod}> {tier.period}</Text></Text>
            </View>
            {tier.features.map((feature) => (
              <Text key={feature} style={styles.featureItem}>✓ {feature}</Text>
            ))}
            <Pressable
              style={styles.tierCta}
              onPress={() => Linking.openURL('mailto:business@howdymornin.io?subject=Howdy Morning for Business — ' + tier.name)}
            >
              <Text style={styles.tierCtaText}>{tier.cta}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Privacy first</Text>
        <Text style={styles.cardText}>
          Each employee connects their own wearable (Oura, Whoop, Apple Health, Fitbit).
          Only aggregate, anonymized metrics are shown to managers — never individual health data.
          Employees can disconnect at any time. GDPR and HIPAA aware.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended wellness gear</Text>
        <Text style={styles.cardText}>Products we recommend for energy and recovery. Some links may be affiliate links that support Howdy Morning.</Text>
        {AFFILIATE_LINKS.map((item) => (
          <Pressable
            key={item.brand}
            style={styles.affiliateRow}
            onPress={() => Linking.openURL(item.url)}
          >
            <View style={styles.affiliateInfo}>
              <Text style={styles.affiliateBrand}>{item.brand}</Text>
              <Text style={styles.affiliateDesc}>{item.description}</Text>
            </View>
            <Text style={styles.affiliateLink}>Visit →</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    container: { padding: 20, gap: 16, backgroundColor: colors.background },
    title: { ...typography.display1, color: colors.text },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 10 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    cardText: { color: colors.textMuted, lineHeight: 20 },
    statRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 28, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    tierCard: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16, marginTop: 12, gap: 6 },
    tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    tierName: { fontSize: 18, fontWeight: '800', color: colors.text },
    tierPrice: { fontSize: 22, fontWeight: '900', color: colors.primary },
    tierPeriod: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
    featureItem: { color: colors.textMuted, fontSize: 14, marginLeft: 4 },
    tierCta: { backgroundColor: colors.primary, borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 8 },
    tierCtaText: { color: colors.onPrimary, fontWeight: '800' },
    affiliateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12, marginTop: 8 },
    affiliateInfo: { flex: 1 },
    affiliateBrand: { fontSize: 16, fontWeight: '700', color: colors.text },
    affiliateDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    affiliateLink: { color: colors.primary, fontWeight: '700' },
  });
