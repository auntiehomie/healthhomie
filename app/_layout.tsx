import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/services/authClient';

export default function RootLayout() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Re-checks on every navigation, not just app boot: login.tsx writes the token to storage
  // then navigates directly, and this is the only way this layout learns the token now
  // exists instead of fighting that navigation with a stale "not authed" redirect below.
  useEffect(() => {
    let active = true;
    getToken()
      .then((token) => { if (active) setAuthed(!!token); })
      .catch(() => { if (active) setAuthed(false); })
      .finally(() => { if (active) setAuthChecked(true); });
    return () => {
      active = false;
    };
  }, [segments]);

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
