import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getSurvey, saveSurvey, type SurveyInput, type SurveyResponse } from '@/lib/services/surveyClient';
import { decryptWithPassphrase, encryptWithPassphrase } from '@/lib/services/privacy';

const MOVEMENT_OPTIONS = ['Sedentary', 'Lightly active', 'Moderately active', 'Very active', 'Extremely active'];
const REVIEW_FREQUENCY_OPTIONS = ['Never', 'Rarely', 'Weekly', 'Daily'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function SurveyScreen() {
  const [survey, setSurvey] = useState<SurveyResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [heightCm, setHeightCm] = useState('');
  const [movement, setMovement] = useState<string | null>(null);
  const [goals, setGoals] = useState('');

  const [weightLocked, setWeightLocked] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [savePassphrase, setSavePassphrase] = useState('');

  const [notesHabit, setNotesHabit] = useState('');
  const [notesReviewFrequency, setNotesReviewFrequency] = useState<string | null>(null);
  const [notesSystem, setNotesSystem] = useState('');
  const [notesChallenge, setNotesChallenge] = useState('');

  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSurvey()
        .then((data) => {
          setSurvey(data);
          setLoaded(true);
          if (!data) return;
          setHeightCm(data.heightCm != null ? String(data.heightCm) : '');
          setMovement(data.movement);
          setGoals(data.goals ?? '');
          setNotesHabit(data.notesHabit ?? '');
          setNotesReviewFrequency(data.notesReviewFrequency);
          setNotesSystem(data.notesSystem ?? '');
          setNotesChallenge(data.notesChallenge ?? '');
          setWeightLocked(!!data.weightCiphertext);
        })
        .catch((err) => {
          setLoaded(true);
          setStatus(err instanceof Error ? err.message : 'Failed to load your survey.');
        });
    }, [])
  );

  function unlockWeight() {
    setUnlockError(null);
    if (!survey?.weightCiphertext || !survey.weightSalt || !survey.weightIv) return;
    const result = decryptWithPassphrase(
      { ciphertext: survey.weightCiphertext, salt: survey.weightSalt, iv: survey.weightIv },
      unlockPassphrase
    );
    if (!result) {
      setUnlockError('Incorrect passphrase.');
      return;
    }
    setWeightValue(result);
    setSavePassphrase(unlockPassphrase);
    setWeightLocked(false);
  }

  function startFreshWeight() {
    setWeightLocked(false);
    setWeightValue('');
    setSavePassphrase('');
    setUnlockPassphrase('');
    setUnlockError(null);
  }

  async function submit() {
    setSaving(true);
    setStatus(null);
    try {
      let weightFields: SurveyInput = {};
      if (weightValue.trim()) {
        if (!savePassphrase.trim()) {
          setStatus('Choose a passphrase to save your weight privately, or clear the weight field to skip it.');
          setSaving(false);
          return;
        }
        const encrypted = await encryptWithPassphrase(weightValue.trim(), savePassphrase.trim());
        weightFields = { weightCiphertext: encrypted.ciphertext, weightSalt: encrypted.salt, weightIv: encrypted.iv };
      }

      const parsedHeight = Number(heightCm);
      const saved = await saveSurvey({
        heightCm: heightCm.trim() && Number.isFinite(parsedHeight) ? parsedHeight : null,
        movement,
        goals: goals.trim() || null,
        notesHabit: notesHabit.trim() || null,
        notesReviewFrequency,
        notesSystem: notesSystem.trim() || null,
        notesChallenge: notesChallenge.trim() || null,
        ...weightFields,
      });
      setSurvey(saved);
      setWeightLocked(!!saved.weightCiphertext);
      setStatus('Saved — thanks for filling this out!');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Quick survey</Text>
      <Text style={styles.subtitle}>Totally optional — skip anything you&apos;d rather not answer.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body & movement</Text>

        <Text style={styles.label}>Height (cm)</Text>
        <TextInput placeholder="e.g. 175" keyboardType="numeric" value={heightCm} onChangeText={setHeightCm} style={styles.input} />

        <Text style={styles.label}>Weight</Text>
        <Text style={styles.helperText}>
          🔒 Weight is encrypted on your device with a passphrase before it&apos;s ever sent — the server (and the
          developer looking at the database) only ever sees scrambled data, never the number itself. There&apos;s
          no way to recover it if you forget the passphrase, but you can always save a new one.
        </Text>

        {weightLocked ? (
          <>
            <View style={styles.unlockRow}>
              <TextInput
                placeholder="Passphrase to view/edit"
                secureTextEntry
                value={unlockPassphrase}
                onChangeText={setUnlockPassphrase}
                style={[styles.input, styles.unlockInput]}
              />
              <Pressable style={styles.smallButton} onPress={unlockWeight}>
                <Text style={styles.smallButtonText}>Unlock</Text>
              </Pressable>
            </View>
            {unlockError && <Text style={styles.error}>{unlockError}</Text>}
            <Pressable onPress={startFreshWeight}>
              <Text style={styles.linkText}>Forgot it? Save a new weight instead</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput placeholder="e.g. 154 lb or 70 kg" value={weightValue} onChangeText={setWeightValue} style={styles.input} />
            <TextInput
              placeholder="Choose a passphrase to protect it"
              secureTextEntry
              value={savePassphrase}
              onChangeText={setSavePassphrase}
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>Movement</Text>
        <View style={styles.chipRow}>
          {MOVEMENT_OPTIONS.map((option) => (
            <Chip key={option} label={option} active={movement === option} onPress={() => setMovement(option)} />
          ))}
        </View>

        <Text style={styles.label}>Current goal</Text>
        <TextInput placeholder="e.g. lose fat, run a 5k, more energy..." value={goals} onChangeText={setGoals} style={styles.input} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Knowledge & productivity</Text>

        <Text style={styles.label}>How do you currently take notes?</Text>
        <TextInput
          placeholder="Paper, an app, I don't really..."
          value={notesHabit}
          onChangeText={setNotesHabit}
          style={styles.input}
        />

        <Text style={styles.label}>How often do you revisit old notes?</Text>
        <View style={styles.chipRow}>
          {REVIEW_FREQUENCY_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              active={notesReviewFrequency === option}
              onPress={() => setNotesReviewFrequency(option)}
            />
          ))}
        </View>

        <Text style={styles.label}>Do you use a specific system? (Zettelkasten, PARA, GTD...)</Text>
        <TextInput placeholder="e.g. Zettelkasten, none..." value={notesSystem} onChangeText={setNotesSystem} style={styles.input} />

        <Text style={styles.label}>Biggest challenge with knowledge management?</Text>
        <TextInput
          placeholder="What gets in the way?"
          value={notesChallenge}
          onChangeText={setNotesChallenge}
          multiline
          style={[styles.input, styles.multiline]}
        />
      </View>

      {status && <Text style={styles.status}>{status}</Text>}

      <Pressable style={[styles.button, saving && styles.buttonDisabled]} onPress={submit} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save survey'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: '#fffaf2' },
  title: { fontSize: 32, fontWeight: '900', color: '#211d18' },
  subtitle: { color: '#665f54', lineHeight: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 18, gap: 10 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#211d18', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '700', color: '#443d34', marginTop: 6 },
  helperText: { color: '#665f54', lineHeight: 18, fontSize: 12 },
  input: { backgroundColor: '#fffaf2', borderRadius: 14, padding: 12, fontSize: 15, color: '#211d18' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  unlockRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  unlockInput: { flex: 1 },
  smallButton: { backgroundColor: '#4f7c59', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  smallButtonText: { color: '#fffaf2', fontWeight: '800' },
  linkText: { color: '#4f7c59', fontWeight: '700', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fffaf2', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#4f7c59' },
  chipText: { color: '#443d34', fontWeight: '700', fontSize: 12 },
  chipTextActive: { color: '#fffaf2' },
  status: { color: '#4f7c59', fontWeight: '700', textAlign: 'center' },
  error: { color: '#b3423b', fontWeight: '600' },
  button: { backgroundColor: '#4f7c59', borderRadius: 16, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fffaf2', fontWeight: '800', fontSize: 16 },
});
