import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { apiUrl, getToken } from '@/lib/services/authClient';
import { createId } from '@/lib/db/database';
import { parsePhotoMeal } from '@/lib/domain/photoMeal';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { FoodItem } from '@/types/healthhomie';

export function PhotoMealCapture({ onFound, autoOpen = false }: { onFound: (food: FoodItem) => void; autoOpen?: boolean }) {
  const camera = useRef<CameraView>(null);
  const busyRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  // null follows asynchronously loaded permission until the user opens/closes the camera.
  // Opening the camera never sends an image; analysis still requires an explicit snap.
  const [cameraOpen, setOpened] = useState<boolean | null>(autoOpen ? null : false);
  const opened = cameraOpen ?? (Platform.OS === 'web' || !!permission?.granted);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const { colors } = useTheme();
  const button = { backgroundColor: colors.primary, borderRadius: 12, padding: 12 };
  async function estimate() {
    if (busyRef.current || !ready) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const token = await getToken();
      if (!token) throw new Error('Log in first.');
      const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.35 });
      if (!photo?.base64) throw new Error('Could not capture photo.');
      const response = await fetch(apiUrl('/api/ai/food-photo'), {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ image: photo.base64.replace(/^data:image\/jpeg;base64,/, '') }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Photo analysis failed.');
      const items = parsePhotoMeal(JSON.stringify(payload));
      if (!items) throw new Error('Invalid estimate received.');
      const now = new Date().toISOString();
      setFoods(items.map(item => ({ ...item, id: createId('photo'), brand: 'AI photo estimate', source: 'custom', servingSize: 1, servingUnit: 'pictured portion', createdAt: now, updatedAt: now })));
      setOpened(false); setReady(false);
      if (!items.length) setError('No food identified. Try a clearer photo.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Photo analysis failed.'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <View style={{ gap: 12 }}>
    <Text style={{ color: colors.text }}>Photo meal estimates</Text>
    <Text style={{ color: colors.textMuted }}>Taking a photo sends it to our existing Anthropic AI service for analysis. Photos are not saved to your journal. Estimates can be wrong: edit names/macros below, then review the portion and confirm each item.</Text>
    {!opened && <Pressable style={button} onPress={async () => {
      setError('');
      if (Platform.OS === 'web' || permission?.granted || (await requestPermission()).granted) setOpened(true);
      else setError('Camera permission denied. Enable it in device settings.');
    }}><Text style={{ color: colors.onPrimary }}>Open meal camera</Text></Pressable>}
    {opened && <>
      <View style={{ height: 280, overflow: 'hidden', borderRadius: 16 }}><CameraView ref={camera} style={{ flex: 1 }} facing="back" onCameraReady={() => setReady(true)} onMountError={() => { setOpened(false); setReady(false); setError('Camera unavailable. Check permissions.'); }} /></View>
      <Pressable style={button} disabled={busy || !ready} onPress={() => void estimate()}><Text style={{ color: colors.onPrimary }}>{busy ? 'Estimating…' : 'Snap and estimate'}</Text></Pressable>
      <Pressable disabled={busy} onPress={() => { setOpened(false); setReady(false); }}><Text style={{ color: colors.text }}>Close camera</Text></Pressable>
    </>}
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}
    {foods.map(food => <View key={food.id} style={{ gap: 6 }}>
      <TextInput accessibilityLabel="Estimated food name" value={food.name} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, padding: 8 }} onChangeText={name => setFoods(current => current.map(f => f.id === food.id ? { ...f, name } : f))} />
      {(['calories', 'proteinG', 'carbsG', 'fatG'] as const).map(key => <View key={key} style={{ flexDirection: 'row', gap: 8 }}>
        <Text style={{ color: colors.text }}>{key}</Text>
        <TextInput accessibilityLabel={`Estimated ${key}`} keyboardType="decimal-pad" value={String(food[key])} style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, minWidth: 80 }} onChangeText={text => setFoods(current => current.map(f => f.id === food.id ? { ...f, [key]: text === '' ? NaN : Number(text) } : f))} />
      </View>)}
      <Pressable style={button} disabled={!food.name.trim() || !parsePhotoMeal(JSON.stringify({ items: [food] }))} onPress={() => onFound(food)}><Text style={{ color: colors.onPrimary }}>Review portion & log item</Text></Pressable>
      <Pressable onPress={() => setFoods(current => current.filter(f => f.id !== food.id))}><Text style={{ color: colors.text }}>Dismiss item (also use after logging)</Text></Pressable>
    </View>)}
  </View>;
}
