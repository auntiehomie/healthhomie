import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export default function FitbitConnectedScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ connected?: string; error?: string }>();
  const message = params.error
    ? `Fitbit connection failed (${params.error}).`
    : params.connected === 'true'
      ? 'Fitbit connected! Redirecting...'
      : 'Fitbit connection did not complete.';

  useEffect(() => {
    if (params.connected !== 'true') return;
    const timeout = setTimeout(() => router.replace('/(tabs)/settings'), 800);
    return () => clearTimeout(timeout);
  }, [params.connected]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    text: { fontSize: 16, color: colors.text, textAlign: 'center' },
  });
