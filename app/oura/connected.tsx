import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { persistOuraTokens } from '@/lib/services/ouraClient';

export default function OuraConnectedScreen() {
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string; expires_in?: string; error?: string }>();
  const [message, setMessage] = useState('Finishing Oura connection...');

  useEffect(() => {
    persistOuraTokens(params).then((result) => {
      setMessage(result.connected ? 'Oura connected! Redirecting...' : result.reason ?? 'Oura connection failed.');
      if (result.connected) setTimeout(() => router.replace('/(tabs)/settings'), 800);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.access_token, params.refresh_token, params.expires_in, params.error]);

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
