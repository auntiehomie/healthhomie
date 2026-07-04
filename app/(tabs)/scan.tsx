import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lookupBarcode } from '@/lib/services/nutritionApi';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [status, setStatus] = useState('Barcode lookup is wired to Open Food Facts route scaffolding.');

  if (!permission) return <View style={styles.container}><Text>Loading camera permission…</Text></View>;

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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16, backgroundColor: '#fffaf2' },
  title: { fontSize: 32, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', lineHeight: 20 },
  camera: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  button: { backgroundColor: '#4f7c59', padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fffaf2', fontWeight: '800' },
  status: { color: '#443d34', lineHeight: 20, backgroundColor: '#ffffff', padding: 14, borderRadius: 16 },
});
