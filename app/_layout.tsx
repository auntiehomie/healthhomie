import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initializeDatabase, seedDemoData } from '@/lib/db/database';

export default function RootLayout() {
  useEffect(() => {
    initializeDatabase().then(seedDemoData).catch((error) => console.warn('Database initialization failed', error));
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
