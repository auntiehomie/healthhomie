import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { requestHealthPermissions } from '@/lib/services/healthkit';
import { connectOura, getOuraStatus, syncOura } from '@/lib/services/ouraClient';
import { logout } from '@/lib/services/authClient';
import { createInviteCode, InviteForbiddenError, listInviteCodes, revokeInviteCode, type InviteCode } from '@/lib/services/inviteClient';
import { useTheme, type ThemePreference } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';

function inviteStatus(invite: InviteCode): string {
  if (invite.revokedAt) return 'Revoked';
  if (invite.usedAt) return `Used${invite.usedByEmail ? ` by ${invite.usedByEmail}` : ''}`;
  return 'Available';
}

const APPEARANCE_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [healthStatus, setHealthStatus] = useState('Not requested yet');
  const [ouraStatus, setOuraStatus] = useState('Not connected');
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [canManageInvites, setCanManageInvites] = useState(true);

  useEffect(() => {
    getOuraStatus().then((status) => {
      if (status.connected) setOuraStatus(status.lastSyncedAt ? `Connected, last synced ${status.lastSyncedAt}` : 'Connected, not synced yet');
    });
    refreshInvites();
  }, []);

  function refreshInvites() {
    listInviteCodes()
      .then((result) => {
        setInvites(result);
        setCanManageInvites(true);
      })
      .catch((err) => {
        // A 403 here just means this account isn't the owner — expected, not an error to show.
        if (err instanceof InviteForbiddenError) {
          setCanManageInvites(false);
          return;
        }
        setInviteError(err instanceof Error ? err.message : 'Failed to load invite codes.');
      });
  }

  async function handleGenerateInvite() {
    setGeneratingInvite(true);
    setInviteError(null);
    try {
      await createInviteCode();
      refreshInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to create invite code.');
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function handleRevokeInvite(id: string) {
    setInviteError(null);
    try {
      await revokeInviteCode(id);
      refreshInvites();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to revoke invite code.');
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function connectHealth() {
    const result = await requestHealthPermissions();
    setHealthStatus(result.granted ? 'Apple Health connected' : result.reason ?? 'Apple Health unavailable');
  }

  async function handleConnectOura() {
    setOuraStatus('Connecting...');
    const result = await connectOura();
    if (result.reason) setOuraStatus(result.reason);
  }

  async function handleSyncOura() {
    setOuraStatus('Syncing...');
    const result = await syncOura();
    setOuraStatus(result.reason ?? `Synced ${result.synced} days of Oura data.`);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Your journal and profile sync across web, iOS, and Android through your account.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <Text style={styles.cardText}>Choose light, dark, or match your device.</Text>
        <View style={styles.chipRow}>
          {APPEARANCE_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setPreference(option.key)}
              style={[styles.chip, preference === option.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, preference === option.key && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Apple Health</Text>
        <Text style={styles.cardText}>Reads: steps, active energy, weight, sleep, workouts. Optional writes: daily nutrition totals.</Text>
        <Pressable style={[styles.button, Platform.OS !== 'ios' && styles.buttonDisabled]} onPress={connectHealth} disabled={Platform.OS !== 'ios'}>
          <Text style={styles.buttonText}>{Platform.OS === 'ios' ? 'Connect Apple Health' : 'HealthKit is iOS-only'}</Text>
        </Pressable>
        <Text style={styles.status}>{healthStatus}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Oura</Text>
        <Text style={styles.cardText}>Sleep, readiness, and activity for web + mobile. Works without HealthKit.</Text>
        <Pressable style={styles.button} onPress={handleConnectOura}>
          <Text style={styles.buttonText}>Connect Oura</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleSyncOura}>
          <Text style={styles.buttonText}>Sync Oura data</Text>
        </Pressable>
        <Text style={styles.status}>{ouraStatus}</Text>
      </View>

      {canManageInvites && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite friends</Text>
          <Text style={styles.cardText}>Generate a one-time code for someone to register their own account.</Text>
          <Pressable style={[styles.button, generatingInvite && styles.buttonDisabled]} onPress={handleGenerateInvite} disabled={generatingInvite}>
            <Text style={styles.buttonText}>{generatingInvite ? 'Generating...' : 'Generate invite code'}</Text>
          </Pressable>
          {inviteError && <Text style={styles.error}>{inviteError}</Text>}
          {invites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteCode}>{invite.code}</Text>
                <Text style={styles.status}>{inviteStatus(invite)}</Text>
              </View>
              {!invite.usedAt && !invite.revokedAt && (
                <Pressable style={styles.revokeButton} onPress={() => handleRevokeInvite(invite.id)}>
                  <Text style={styles.revokeButtonText}>Revoke</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Survey</Text>
        <Text style={styles.cardText}>An optional check-in on body stats, movement, and how you manage notes and knowledge.</Text>
        <Pressable style={styles.button} onPress={() => router.push('/survey')}>
          <Text style={styles.buttonText}>Take the survey</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Legal</Text>
        <Link href="/legal/privacy" style={styles.link}>Privacy Policy</Link>
        <Link href="/legal/terms" style={styles.link}>Terms of Service</Link>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { padding: 20, gap: 16, backgroundColor: colors.background },
    title: { fontSize: 32, fontWeight: '900', color: colors.text },
    subtitle: { color: colors.textMuted, lineHeight: 20 },
    card: { backgroundColor: colors.surface, borderRadius: 24, padding: 18, gap: 10 },
    cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
    cardText: { color: colors.textMuted, lineHeight: 20 },
    button: { backgroundColor: colors.primary, borderRadius: 16, padding: 14, alignItems: 'center' },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: colors.onPrimary, fontWeight: '800' },
    status: { color: colors.text, fontWeight: '700' },
    link: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
    error: { color: colors.danger, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.chipBackground },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.chipText, fontWeight: '700' },
    chipTextActive: { color: colors.onPrimary },
    inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 12 },
    inviteInfo: { gap: 2 },
    inviteCode: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 1 },
    revokeButton: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
    revokeButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 12 },
  });
