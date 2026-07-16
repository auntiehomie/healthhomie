import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { requestPasswordReset } from '@/lib/services/authClient';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>Enter your account email and we&apos;ll send you a reset link.</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      {message && <Text style={styles.message}>{message}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Sending...' : 'Send reset link'}</Text>
      </Pressable>

      <Pressable onPress={() => router.replace('/login')}>
        <Text style={styles.switchText}>Back to log in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: '#fffaf2', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#211d18', textAlign: 'center' },
  subtitle: { color: '#665f54', textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, fontSize: 16 },
  message: { color: '#4f7c59', fontWeight: '600', textAlign: 'center' },
  error: { color: '#b3423b', fontWeight: '600', textAlign: 'center' },
  button: { backgroundColor: '#4f7c59', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fffaf2', fontWeight: '800', fontSize: 16 },
  switchText: { color: '#4f7c59', fontWeight: '700', textAlign: 'center', marginTop: 12 },
});
