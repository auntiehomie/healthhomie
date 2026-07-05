import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

export default function OuraConnectedScreen() {
  const params = useLocalSearchParams<{ connected?: string; error?: string }>();
  const message = params.error
    ? `Oura connection failed (${params.error}).`
    : params.connected === 'true'
      ? 'Oura connected! Redirecting...'
      : 'Oura connection did not complete.';

  useEffect(() => {
    if (params.connected !== 'true') return;
    const timeout = setTimeout(() => router.replace('/(tabs)/settings'), 800);
    return () => clearTimeout(timeout);
  }, [params.connected]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fffaf2' },
  text: { fontSize: 16, color: '#211d18', textAlign: 'center' },
});
