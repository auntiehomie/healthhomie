import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lookupBarcode } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { FoodItem } from '@/types/healthhomie';

/** Camera + Open Food Facts lookup. Calls onFound once per distinct barcode; a miss or error un-blocks that barcode so the same one can be retried. */
export function BarcodeScanner({ onFound }: { onFound: (food: FoodItem) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [status, setStatus] = useState('Point the camera at a barcode.');

  if (!permission) return <View style={styles.container}><Text style={styles.subtitle}>Loading camera permission…</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Camera access lets Howdy Morning look up barcodes through Open Food Facts.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (data === lastBarcode || looking) return;
    setLastBarcode(data);
    setLooking(true);
    setStatus(`Found barcode ${data}. Looking up nutrition…`);
    try {
      const food = await lookupBarcode(data);
      if (food) {
        onFound(food);
        setStatus('Point the camera at a barcode.');
      } else {
        setStatus('No Open Food Facts match for that barcode yet. Try another.');
        setLastBarcode(null);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Lookup failed. Try again.');
      setLastBarcode(null);
    } finally {
      setLooking(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { gap: 12 },
    camera: { height: 340, borderRadius: 24, overflow: 'hidden' },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    button: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
    buttonText: { color: colors.onPrimary, fontWeight: '800' },
    status: { color: colors.text, lineHeight: 20, backgroundColor: colors.surface, padding: 14, borderRadius: 16 },
  });
