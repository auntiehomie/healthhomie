import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { router } from 'expo-router';
import { PressableFeedback as Pressable } from '@/components/ui/PressableFeedback';
import { requestPasswordReset } from '@/lib/services/authClient';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        placeholderTextColor={colors.textMuted}
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: colors.background, justifyContent: 'center' },
    title: { ...typography.display2, color: colors.text, textAlign: 'center' },
    subtitle: { ...typography.bodyMedium, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
    input: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, fontSize: 16, color: colors.text },
    message: { color: colors.success, fontWeight: '600', textAlign: 'center' },
    error: { color: colors.danger, fontWeight: '600', textAlign: 'center' },
    button: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
    switchText: { color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  });
