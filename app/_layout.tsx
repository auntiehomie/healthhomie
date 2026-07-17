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
    const publicRoutes = ['login', 'forgot-password', 'reset-password'];
    const inPublicRoute = publicRoutes.includes(segments[0] as string);
    if (!authed && !inPublicRoute) router.replace('/login');
    if (authed && segments[0] === 'login') router.replace('/(tabs)');
  }, [authChecked, authed, segments, router]);

  if (!authChecked) return null;

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="survey" options={{ title: "Quick Survey", headerStyle: { backgroundColor: "#fffaf2" }, headerTintColor: "#211d18", headerTitleStyle: { fontWeight: "900" } }} />
        <Stack.Screen name="oura/connected" options={{ title: "Oura Connected", headerStyle: { backgroundColor: "#fffaf2" }, headerTintColor: "#211d18", headerTitleStyle: { fontWeight: "900" } }} />
        <Stack.Screen name="legal/privacy" options={{ title: "Privacy Policy", headerStyle: { backgroundColor: "#fffaf2" }, headerTintColor: "#211d18", headerTitleStyle: { fontWeight: "900" } }} />
        <Stack.Screen name="legal/terms" options={{ title: "Terms of Service", headerStyle: { backgroundColor: "#fffaf2" }, headerTintColor: "#211d18", headerTitleStyle: { fontWeight: "900" } }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
