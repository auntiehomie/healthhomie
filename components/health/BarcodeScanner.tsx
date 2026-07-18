import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { lookupBarcode } from '@/lib/services/nutritionApi';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import type { FoodItem } from '@/types/healthhomie';

/** Camera + Open Food Facts lookup. Calls onFound once per distinct barcode; a miss or error un-blocks that barcode so the same one can be retried. */
export function BarcodeScanner({ onFound }: { onFound: (food: FoodItem) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  // Web's permission pre-check opens a throwaway getUserMedia stream just to test for
  // permission, then immediately stops it — on iOS Safari, opening a second stream right after
  // closing the first can leave the camera stuck with no frames. Skip that pre-check on web and
  // let CameraView's own single getUserMedia call both prompt for permission and open the real
  // stream; native still needs the explicit permission gate before it'll mount the camera at all.
  const [webCameraRequested, setWebCameraRequested] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [status, setStatus] = useState('Point the camera at a barcode.');

  const showCamera = Platform.OS === 'web' ? webCameraRequested : !!permission?.granted;

  if (!showCamera) {
    if (Platform.OS !== 'web' && !permission) {
      return <View style={styles.container}><Text style={styles.subtitle}>Loading camera permission…</Text></View>;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.subtitle}>Camera access lets Howdy Morning look up barcodes through Open Food Facts.</Text>
        {cameraError && <Text style={styles.error}>{cameraError}</Text>}
        <Pressable
          style={styles.button}
          onPress={() => (Platform.OS === 'web' ? setWebCameraRequested(true) : requestPermission())}
        >
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
      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={handleBarcodeScanned}
          onMountError={(event) => {
            setCameraError(event.message || 'Could not access the camera. Check your browser or device camera permission and try again.');
            setWebCameraRequested(false);
          }}
        />
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { gap: 12 },
    // A plain (non-flex) wrapper with a real height: CameraView's own web implementation sets
    // flex-basis:0 on its root View, which — per CSS flexbox rules for a column container —
    // makes the browser ignore any `height` passed via CameraView's own `style` prop. Giving
    // the height to this ordinary wrapper instead, and letting CameraView absolutely-fill it,
    // sidesteps that fight entirely.
    cameraWrapper: { height: 340, borderRadius: 24, overflow: 'hidden', position: 'relative' },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    error: { color: colors.danger, fontWeight: '600' },
    button: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
    buttonText: { color: colors.onPrimary, fontWeight: '800' },
    status: { color: colors.text, lineHeight: 20, backgroundColor: colors.surface, padding: 14, borderRadius: 16 },
  });
