import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/services/authClient';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import { UpdateBanner } from '@/components/UpdateBanner';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

function AppShell() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { colors, scheme } = useTheme();

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
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <UpdateBanner />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
