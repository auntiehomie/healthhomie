import { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { applyUpdate, registerServiceWorker, useUpdateAvailable } from '@/lib/services/pwaUpdate';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export function UpdateBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const available = useUpdateAvailable();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (Platform.OS !== 'web' || !available) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>A new version is available.</Text>
      <Pressable style={styles.button} onPress={applyUpdate}>
        <Text style={styles.buttonText}>Refresh</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    banner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: colors.primary,
    },
    text: { color: colors.onPrimary, fontWeight: '700', flex: 1 },
    button: { backgroundColor: colors.onPrimary, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
    buttonText: { color: colors.primary, fontWeight: '800' },
  });
