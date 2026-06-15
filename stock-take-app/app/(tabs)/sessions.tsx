import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { PromptModal } from '@/components/ui/PromptModal';
import { colors, spacing, typography, tapTarget } from '@/config/theme';
import { loadSettings } from '@/config/settings';
import { getRepositories } from '@/services/db';
import { syncOnSessionClose } from '@/services/spreadsheetSync';
import type { CountSession } from '@/types';

export default function SessionsScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<CountSession[]>([]);
  const [openSession, setOpenSession] = useState<CountSession | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const repos = await getRepositories();
    const all = await repos.sessions.getAll();
    const open = await repos.sessions.getOpen();
    setSessions(all);
    setOpenSession(open);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startSession = async (name: string) => {
    if (!name.trim()) return;
    if (openSession) {
      Alert.alert('Session already open', `Close "${openSession.name}" before starting a new one.`);
      setPromptOpen(false);
      return;
    }
    const repos = await getRepositories();
    await repos.sessions.create(name.trim());
    setPromptOpen(false);
    await load();
    router.push('/');
  };

  const closeSession = async () => {
    if (!openSession) return;
    const sessionId = openSession.id;
    const repos = await getRepositories();
    await repos.sessions.close(sessionId);
    await load();

    const settings = await loadSettings();
    if (settings.spreadsheetProvider !== 'none') {
      const syncResult = await syncOnSessionClose(sessionId);
      if (syncResult.skipped) {
        if (syncResult.reason === 'offline') {
          setCloseMessage('Session closed — counts queued for sync when online');
        } else if (syncResult.reason === 'empty_session') {
          setCloseMessage('Session closed — no counts to sync');
        }
      } else if (syncResult.error) {
        setCloseMessage(`Session closed — sync failed: ${syncResult.error}`);
      } else {
        setCloseMessage(
          `Session closed — synced ${syncResult.completed} entries` +
            (syncResult.conflicts.length ? ` (${syncResult.conflicts.length} conflicts)` : '')
        );
      }
      setTimeout(() => setCloseMessage(null), 4000);
    }
  };

  return (
    <Screen title="Sessions" subtitle="Open, close, and review count sessions" scroll={false}>
      {closeMessage ? <StatusMessage message={closeMessage} variant="success" live /> : null}

      {openSession ? (
        <View style={styles.openCard}>
          <Text style={styles.openTitle}>Active session</Text>
          <Text style={styles.openName}>{openSession.name}</Text>
          <Text style={styles.openMeta}>Started {new Date(openSession.started_at).toLocaleString()}</Text>
          <Button label="Go to Count" onPress={() => router.push('/')} />
          <Button label="Close Session" onPress={closeSession} variant="secondary" />
        </View>
      ) : (
        <Button label="Start New Session" onPress={() => setPromptOpen(true)} />
      )}

      <Text style={styles.listTitle}>Past sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.status} · {new Date(item.started_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      />

      <PromptModal
        visible={promptOpen}
        title="Start session"
        message="Name this count session"
        placeholder="Friday bar count"
        submitLabel="Start"
        onSubmit={startSession}
        onCancel={() => setPromptOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  openCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  openTitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  openName: {
    ...typography.heading,
    color: colors.text,
  },
  openMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  listTitle: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    minHeight: tapTarget.minHeight,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
