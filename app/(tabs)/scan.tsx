import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lookupBarcode } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [status, setStatus] = useState('Barcode lookup is wired to Open Food Facts route scaffolding.');

  if (!permission) return <View style={styles.container}><Text style={styles.subtitle}>Loading camera permission…</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scan packaged foods</Text>
        <Text style={styles.subtitle}>Camera access lets Healthhomie look up barcodes through Open Food Facts.</Text>
        <Pressable style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Allow camera</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barcode scan</Text>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={async ({ data }) => {
          if (data === lastBarcode) return;
          setLastBarcode(data);
          setStatus(`Found barcode ${data}. Looking up nutrition…`);
          try {
            const food = await lookupBarcode(data);
            setStatus(food ? `${food.name}: ${Math.round(food.calories)} kcal` : 'No Open Food Facts match yet.');
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Lookup failed.');
          }
        }}
      />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 16, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    camera: { flex: 1, borderRadius: 24, overflow: 'hidden' },
    button: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
    buttonText: { color: colors.onPrimary, fontWeight: '800' },
    status: { color: colors.text, lineHeight: 20, backgroundColor: colors.surface, padding: 14, borderRadius: 16 },
  });
