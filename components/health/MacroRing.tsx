import { StyleSheet, Text, View } from 'react-native';

export function MacroRing({ label, actual, target, color }: { label: string; actual: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((actual / Math.max(target, 1)) * 100));
  return (
    <View style={styles.container}>
      <View style={[styles.ring, { borderColor: color }]}> 
        <Text style={styles.percent}>{pct}%</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{Math.round(actual)} / {Math.round(target)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6, flex: 1 },
  ring: { width: 76, height: 76, borderRadius: 38, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffdfa' },
  percent: { fontWeight: '800', color: '#211d18' },
  label: { color: '#211d18', fontWeight: '700' },
  value: { color: '#7a7165', fontSize: 12 },
});
