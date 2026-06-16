import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { PromptModal } from '@/components/ui/PromptModal';
import { colors, radii, spacing, typography, tapTarget } from '@/config/theme';
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
    <Screen eyebrow="History" title="Sessions" subtitle="Open, close, and review count sessions" scroll={false}>
      {closeMessage ? <StatusMessage message={closeMessage} variant="success" live /> : null}

      {openSession ? (
        <Card accent elevated style={styles.openCard}>
          <View style={styles.openHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.openTitle}>Active session</Text>
          </View>
          <Text style={styles.openName}>{openSession.name}</Text>
          <Text style={styles.openMeta}>Started {new Date(openSession.started_at).toLocaleString()}</Text>
          <View style={styles.openActions}>
            <Button label="Go to Count" icon="mic" onPress={() => router.push('/')} style={styles.flex} />
            <Button label="Close" icon="stop-circle-outline" onPress={closeSession} variant="secondary" style={styles.flex} />
          </View>
        </Card>
      ) : (
        <Button label="Start new session" icon="add-circle" size="lg" onPress={() => setPromptOpen(true)} />
      )}

      <Text style={styles.listTitle}>Past sessions</Text>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet.</Text>}
        renderItem={({ item }) => {
          const closed = item.status !== 'open';
          return (
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: closed ? colors.scrim : colors.successSoft }]}>
                <Ionicons
                  name={closed ? 'checkmark-done' : 'ellipse'}
                  size={16}
                  color={closed ? colors.textMuted : colors.success}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.status} · {new Date(item.started_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          );
        }}
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
    marginBottom: spacing.xs,
  },
  openHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  openTitle: {
    ...typography.overline,
    color: colors.success,
  },
  openName: {
    ...typography.title,
    color: colors.text,
  },
  openMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  openActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  listTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.xs,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: tapTarget.minHeight,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
