import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { resetPassword } from '@/lib/services/authClient';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    if (typeof token !== 'string' || !token) {
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Password updated</Text>
        <Text style={styles.subtitle}>You can log in with your new password now.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Go to log in</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Choose a new password</Text>

      <TextInput placeholder="New password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      <TextInput placeholder="Confirm new password" secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input} />
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Saving...' : 'Save new password'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: '#fffaf2', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#211d18', textAlign: 'center' },
  subtitle: { color: '#665f54', textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, fontSize: 16 },
  error: { color: '#b3423b', fontWeight: '600', textAlign: 'center' },
  button: { backgroundColor: '#4f7c59', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fffaf2', fontWeight: '800', fontSize: 16 },
});
