import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function LegalDocument({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {lines.map((line, index) => {
        const key = `${index}-${line.slice(0, 12)}`;
        if (line.startsWith('# ')) return <Text key={key} style={styles.h1}>{line.slice(2)}</Text>;
        if (line.startsWith('## ')) return <Text key={key} style={styles.h2}>{line.slice(3)}</Text>;
        if (line.startsWith('### ')) return <Text key={key} style={styles.h3}>{line.slice(4)}</Text>;
        if (line.startsWith('- ')) {
          return (
            <View key={key} style={styles.bulletRow}>
              <Text style={styles.bullet}>{'•'}</Text>
              <Text style={styles.bulletText}>{line.slice(2)}</Text>
            </View>
          );
        }
        if (line === '---') return <View key={key} style={styles.divider} />;
        if (line.trim() === '') return <View key={key} style={styles.spacer} />;
        return <Text key={key} style={styles.paragraph}>{line}</Text>;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 4, backgroundColor: '#fffaf2', maxWidth: 720 },
  h1: { fontSize: 28, fontWeight: '900', color: '#211d18', marginBottom: 8 },
  h2: { fontSize: 20, fontWeight: '800', color: '#211d18', marginTop: 16, marginBottom: 4 },
  h3: { fontSize: 16, fontWeight: '700', color: '#211d18', marginTop: 10, marginBottom: 2 },
  paragraph: { fontSize: 14, lineHeight: 21, color: '#443d34' },
  bulletRow: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  bullet: { fontSize: 14, color: '#4f7c59' },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: '#443d34' },
  divider: { height: 1, backgroundColor: '#e4ddd1', marginVertical: 16 },
  spacer: { height: 6 },
});
