import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { login, register } from '@/lib/services/authClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        router.replace('/(tabs)');
      } else {
        await register(email.trim(), password, inviteCode);
        router.replace('/onboarding');
      }
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
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {mode === 'register' && (
        <TextInput
          placeholder="Invite code"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          value={inviteCode}
          onChangeText={setInviteCode}
          style={styles.input}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</Text>
      </Pressable>

      {mode === 'login' && (
        <Pressable onPress={() => router.push('/forgot-password')}>
          <Text style={styles.switchText}>Forgot password?</Text>
        </Pressable>
      )}

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switchText}>{mode === 'login' ? 'Need an account? Register' : 'Have an account? Log in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: colors.background, justifyContent: 'center' },
    title: { fontSize: 34, fontWeight: '900', color: colors.text, textAlign: 'center' },
    subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 16, color: colors.text },
    error: { color: colors.danger, fontWeight: '600', textAlign: 'center' },
    button: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
    switchText: { color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  });
