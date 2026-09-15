import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getToken } from "@/lib/services/authClient";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeContext";
import { UpdateBanner } from "@/components/UpdateBanner";
import { setupMorningCheckInReminder } from "@/lib/services/notifications";
import * as Sentry from "@sentry/react-native";

// Initialize Sentry crash reporting with release tracking
// SENTRY_DSN is injected via app.config.ts extra config
// Release tracking: set SENTRY_RELEASE env var to match the EAS build version
// Source maps: uploaded via `eas build --upload-sourcemaps` or sentry-cli in CI
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
    // Release tracking for production crash symbolication
    // Format: howdymorning@<version>+<buildNumber> (matches EAS build profile)
    release: process.env.SENTRY_RELEASE || `${process.env.EXPO_PUBLIC_SENTRY_RELEASE}` || undefined,
    // Enable source map upload via Sentry React Native Expo plugin
    // @sentry/react-native Expo plugin handles source map upload automatically
    // when SENTRY_AUTH_TOKEN is set in the environment
    environment: process.env.APP_VARIANT || 'development',
    // Attach stack traces to all error events
    attachStacktrace: true,
    // Capture user sessions for release health tracking
    autoSessionTracking: true,
  });
}

// Keeps the native splash screen up (instead of a blank white/black frame) until the auth
// check below resolves and we know whether to render the app or redirect to /login.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
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
        const publicRoutes = ["login", "forgot-password", "reset-password"];
        const inPublicRoute = publicRoutes.includes(segments[0] as string);
        if (!isAuthed && !inPublicRoute) router.replace("/login");
        if (isAuthed && segments[0] === "login") router.replace("/(tabs)");
      })
      .catch(() => {
        if (active) setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, [segments, router]);

  useEffect(() => {
    if (authChecked) void SplashScreen.hideAsync();
  }, [authChecked]);

  useEffect(() => {
    if (authChecked) void setupMorningCheckInReminder();
  }, [authChecked]);

  if (!authChecked) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "900" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe-editor"
          options={{ headerTitle: "Recipe" }}
        />
        <Stack.Screen
          name="restaurant-results"
          options={{ headerTitle: "Restaurants" }}
        />
        <Stack.Screen name="quick-add" options={{ headerTitle: "Quick Add" }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <UpdateBanner />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
    </>
  );
}
