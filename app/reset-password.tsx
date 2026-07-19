import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { resetPassword } from '@/lib/services/authClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

      <TextInput
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <TextInput
        placeholder="Confirm new password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        style={styles.input}
      />
      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Saving...' : 'Save new password'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: colors.background, justifyContent: 'center' },
    title: { ...typography.display2, color: colors.text, textAlign: 'center' },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 16, color: colors.text },
    error: { color: colors.danger, fontWeight: '600', textAlign: 'center' },
    button: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  });
