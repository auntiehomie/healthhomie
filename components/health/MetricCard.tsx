import { StyleSheet, Text, View } from 'react-native';

export function MetricCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 145,
    borderRadius: 20,
    backgroundColor: '#f5f0e8',
    padding: 16,
    gap: 6,
  },
  label: { color: '#665f54', fontSize: 13, fontWeight: '600' },
  value: { color: '#211d18', fontSize: 24, fontWeight: '800' },
  helper: { color: '#7a7165', fontSize: 12 },
});
