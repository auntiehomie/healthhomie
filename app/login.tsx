import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { login, register } from '@/lib/services/authClient';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupSecret, setSignupSecret] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, signupSecret);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Howdy Morning ☀️</Text>
      <Text style={styles.subtitle}>{mode === 'login' ? 'Log in to sync your data.' : 'Create your account.'}</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
      {mode === 'register' && (
        <TextInput placeholder="Signup code" secureTextEntry value={signupSecret} onChangeText={setSignupSecret} style={styles.input} />
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switchText}>{mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: '#fffaf2', justifyContent: 'center' },
  title: { fontSize: 34, fontWeight: '900', color: '#211d18', textAlign: 'center' },
  subtitle: { color: '#665f54', textAlign: 'center', marginBottom: 12 },
  input: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, fontSize: 16 },
  error: { color: '#b3423b', fontWeight: '600', textAlign: 'center' },
  button: { backgroundColor: '#4f7c59', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fffaf2', fontWeight: '800', fontSize: 16 },
  switchText: { color: '#4f7c59', fontWeight: '700', textAlign: 'center', marginTop: 12 },
});
