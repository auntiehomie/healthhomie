import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/services/authClient';

export default function RootLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    getToken()
      .then((token) => setAuthed(!!token))
      .catch(() => setAuthed(false))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const inLogin = segments[0] === 'login';
    if (!authed && !inLogin) router.replace('/login');
    if (authed && inLogin) router.replace('/(tabs)');
  }, [authChecked, authed, segments, router]);

  if (!authChecked) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
