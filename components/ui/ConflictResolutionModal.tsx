import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline Conflict Resolution UI
 *
 * When the same data is modified on multiple devices (e.g., food journal edited
 * on phone + tablet while offline), this component shows the conflicts and lets
 * the user pick which version to keep.
 *
 * Conflict detection strategy:
 * - Each AsyncStorage write stamps a `__updatedAt` timestamp
 * - On sync, server data is compared with local data by key
 * - If both changed since last sync, a conflict is flagged
 */

export interface ConflictEntry {
  key: string;
  localValue: string;
  remoteValue: string;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  label: string;
}

export interface ConflictResolutionProps {
  visible: boolean;
  conflicts: ConflictEntry[];
  onResolve: (key: string, chosenValue: 'local' | 'remote') => Promise<void>;
  onClose: () => void;
}

export function ConflictResolutionModal({
  visible,
  conflicts,
  onResolve,
  onClose,
}: ConflictResolutionProps) {
  const [resolving, setResolving] = useState<string | null>(null);

  const handleResolve = useCallback(
    async (key: string, choice: 'local' | 'remote') => {
      setResolving(key);
      try {
        await onResolve(key, choice);
      } finally {
        setResolving(null);
      }
    },
    [onResolve],
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: ConflictEntry }) => (
    <View style={styles.conflictCard}>
      <Text style={styles.conflictLabel}>{item.label}</Text>
      <Text style={styles.conflictKey}>{item.key}</Text>

      <View style={styles.choicesContainer}>
        <TouchableOpacity
          style={[styles.choiceButton, resolving === item.key && styles.choiceDisabled]}
          onPress={() => handleResolve(item.key, 'local')}
          disabled={resolving === item.key}
        >
          <Text style={styles.choiceTitle}>📱 Local Device</Text>
          <Text style={styles.choiceDate}>Updated {formatDate(item.localUpdatedAt)}</Text>
          <Text style={styles.choicePreview} numberOfLines={3}>
            {item.localValue}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceButton, resolving === item.key && styles.choiceDisabled]}
          onPress={() => handleResolve(item.key, 'remote')}
          disabled={resolving === item.key}
        >
          <Text style={styles.choiceTitle}>☁️ Server</Text>
          <Text style={styles.choiceDate}>Updated {formatDate(item.remoteUpdatedAt)}</Text>
          <Text style={styles.choicePreview} numberOfLines={3}>
            {item.remoteValue}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Resolve Sync Conflicts</Text>
          <Text style={styles.subtitle}>
            {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'} found
          </Text>
        </View>

        {conflicts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conflicts to resolve 🎉</Text>
          </View>
        ) : (
          <FlatList
            data={conflicts}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.list}
          />
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook to detect conflicts between local AsyncStorage and server data.
 * Returns a list of conflicts and a function to open the resolution modal.
 */
export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkForConflicts = useCallback(
    async (localKeys: string[], remoteData: Record<string, { value: string; updatedAt: number }>) => {
      setIsChecking(true);
      const found: ConflictEntry[] = [];

      const pairs = await AsyncStorage.multiGet(localKeys);
      const lastSyncKey = '__lastSyncAt';
      const lastSyncRaw = await AsyncStorage.getItem(lastSyncKey);
      const lastSyncAt = lastSyncRaw ? parseInt(lastSyncRaw, 10) : 0;

      for (const [key, localRaw] of pairs) {
        if (!key || !localRaw) continue;

        const remote = remoteData[key];
        if (!remote) continue;

        // Parse local data to extract updatedAt
        let localUpdatedAt = 0;
        let localValue = localRaw;
        try {
          const parsed = JSON.parse(localRaw);
          if (parsed.__updatedAt) {
            localUpdatedAt = parsed.__updatedAt;
            localValue = JSON.stringify(parsed);
          }
        } catch {
          // Not JSON, treat as plain string
        }

        // Conflict: both local and remote changed since last sync
        if (localUpdatedAt > lastSyncAt && remote.updatedAt > lastSyncAt) {
          if (localValue !== remote.value) {
            found.push({
              key,
              localValue: localValue,
              remoteValue: remote.value,
              localUpdatedAt,
              remoteUpdatedAt: remote.updatedAt,
              label: key.replace(/morning_|_moodLog|_routineDone|_water/g, '').replace(/_/g, ' '),
            });
          }
        }
      }

      setConflicts(found);
      setIsChecking(false);
      return found;
    },
    [],
  );

  const resolveConflict = useCallback(async (key: string, choice: 'local' | 'remote') => {
    const conflict = conflicts.find((c) => c.key === key);
    if (!conflict) return;

    if (choice === 'remote') {
      await AsyncStorage.setItem(key, conflict.remoteValue);
    }
    // If 'local', keep existing local value (no-op)

    setConflicts((prev) => prev.filter((c) => c.key !== key));
  }, [conflicts]);

  return {
    conflicts,
    isChecking,
    checkForConflicts,
    resolveConflict,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  conflictCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conflictLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    textTransform: 'capitalize',
  },
  conflictKey: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  choicesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  choiceButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  choiceDisabled: {
    opacity: 0.5,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  choiceDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  choicePreview: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    fontFamily: 'monospace',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  closeButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
