import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getToken } from '@/lib/services/authClient';
import { ThemeProvider, useTheme } from '@/lib/theme/ThemeContext';
import { UpdateBanner } from '@/components/UpdateBanner';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { colors, scheme } = useTheme();

  // Re-checks on every navigation, not just app boot — login.tsx and the register flow write the
  // token to storage then navigate directly (sometimes straight to a protected, non-tabs route
  // like /survey). The redirect decision below is made from the freshly-resolved token, not from
  // the `authed` state var, since that lags one render behind a same-tick navigation: reading the
  // stale value here previously caused a spurious bounce to /login immediately after registering,
  // which then hardcoded its way back to /(tabs) — skipping wherever we actually meant to land.
  useEffect(() => {
    let active = true;
    getToken()
      .then((token) => {
        if (!active) return;
        const isAuthed = !!token;
        setAuthChecked(true);
        const publicRoutes = ['login', 'forgot-password', 'reset-password'];
        const inPublicRoute = publicRoutes.includes(segments[0] as string);
        if (!isAuthed && !inPublicRoute) router.replace('/login');
        if (isAuthed && segments[0] === 'login') router.replace('/(tabs)');
      })
      .catch(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, [segments, router]);

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
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-editor" options={{ headerTitle: 'Recipe' }} />
        <Stack.Screen name="restaurant-results" options={{ headerTitle: 'Restaurants' }} />
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
