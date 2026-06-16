import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CountConfirmCard } from '@/components/count/CountConfirmCard';
import { PushToTalkButton } from '@/components/count/PushToTalkButton';
import { SessionTotalsList, type SessionTotalRow } from '@/components/count/SessionTotalsList';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, radii, spacing, typography } from '@/config/theme';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useActiveSession } from '@/hooks/useActiveSession';
import { explodeBatchCount } from '@/services/business/bomResolver';
import type { BomComponent } from '@/services/business';
import { getRepositories } from '@/services/db';
import { applyCount } from '@/services/voicePipeline/apply';
import { useVerticalProfile } from '@/hooks/useVerticalProfile';
import { loadMatchableCatalog } from '@/services/voicePipeline/catalog';
import {
  buildCatalogPrompt,
  createVoicePipeline,
  getMatchCandidates,
} from '@/services/voicePipeline/index';
import { findFirstReviewIndex, resolvePendingItem } from '@/services/voicePipeline/review';
import type { PipelineCountItem, VoicePipelineStage } from '@/services/voicePipeline/types';
import { getEffectiveFillLevel, getEffectiveQuantity } from '@/services/voicePipeline/types';
import type { CountEvent, Item } from '@/types';

export default function CountScreen() {
  const { profile } = useVerticalProfile();
  const recorder = useVoiceRecorder();
  const { session, ensureSession, refresh: refreshSession, loading: sessionLoading } = useActiveSession();
  const [stage, setStage] = useState<VoicePipelineStage>('idle');
  const [stageError, setStageError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [pendingItems, setPendingItems] = useState<PipelineCountItem[]>([]);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [resolvedItem, setResolvedItem] = useState<Item | null>(null);
  const [bomPreview, setBomPreview] = useState<BomComponent[]>([]);
  const [totals, setTotals] = useState<SessionTotalRow[]>([]);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);
  const [mockPhraseIndex, setMockPhraseIndex] = useState(0);

  const currentPending = pendingItems[pendingIndex] ?? null;

  const loadTotals = useCallback(async (sessionId?: string) => {
    const id = sessionId ?? session?.id;
    if (!id) {
      setTotals([]);
      return;
    }

    const repos = await getRepositories();
    const events = await repos.countEvents.getBySession(id);
    const items = await repos.items.getAll();
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const grouped = new Map<string, CountEvent[]>();
    for (const event of events) {
      const list = grouped.get(event.item_id) ?? [];
      list.push(event);
      grouped.set(event.item_id, list);
    }

    const rows: SessionTotalRow[] = [];
    for (const [itemId, itemEvents] of grouped) {
      const item = itemMap.get(itemId);
      if (!item) continue;
      rows.push({
        item,
        events: itemEvents,
        totalQty: itemEvents.reduce((sum, e) => sum + e.qty, 0),
      });
    }

    rows.sort((a, b) => a.item.name.localeCompare(b.item.name));
    setTotals(rows);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const open = await refreshSession();
        await loadTotals(open?.id);
      })();
    }, [loadTotals, refreshSession])
  );

  const loadReviewContext = useCallback(async (pending: PipelineCountItem) => {
    const repos = await getRepositories();
    const item = await resolvePendingItem(repos, pending);
    setResolvedItem(item);

    if (item?.is_batch && profile.features.fillLevel) {
      const fill =
        pending.fillLevelOverride ??
        getEffectiveFillLevel(pending, item) ??
        (pending.quantity <= 1 ? pending.quantity : 0.5);
      const preview = await explodeBatchCount(repos, item, fill);
      setBomPreview(preview);
    } else {
      setBomPreview([]);
    }
  }, []);

  useEffect(() => {
    if (currentPending && stage === 'confirming') {
      loadReviewContext(currentPending);
    }
  }, [currentPending, stage, loadReviewContext]);

  const applyAllItems = useCallback(
    async (items: PipelineCountItem[], transcript: string) => {
      setStage('applying');
      const activeSession = await ensureSession();
      const repos = await getRepositories();
      let appliedCount = 0;

      for (const pending of items) {
        if (pending.skipped) continue;

        const itemId = pending.selectedItemId ?? pending.match.best?.itemId;
        if (!itemId) continue;

        const item = await repos.items.getById(itemId);
        if (!item) continue;

        let recipeVersion: number | null = null;
        if (item.is_batch && profile.features.batchItems) {
          const recipe = await repos.recipes.getCurrent(item.id);
          recipeVersion = recipe?.version ?? null;
        }

        const spokenQuantity = getEffectiveQuantity(pending);
        const fillLevelOverride =
          item.is_batch && profile.features.fillLevel
            ? (pending.fillLevelOverride ??
              getEffectiveFillLevel(pending, item) ??
              (spokenQuantity <= 1 ? spokenQuantity : null))
            : null;

        await applyCount(repos, {
          sessionId: activeSession.id,
          item,
          spokenQuantity,
          rawTranscript: transcript,
          confidenceScore: pending.match.best?.score ?? 0,
          recipeVersion,
          fillLevelOverride,
        });
        appliedCount += 1;
      }

      setPendingItems([]);
      setPendingIndex(0);
      setResolvedItem(null);
      setBomPreview([]);
      setStage('idle');
      if (appliedCount > 0) {
        setUndoMessage(`Count applied (${appliedCount} item${appliedCount === 1 ? '' : 's'})`);
      } else {
        setUndoMessage('No matching items to apply');
      }
      await loadTotals(activeSession.id);
      setTimeout(() => setUndoMessage(null), 2500);
    },
    [ensureSession, loadTotals]
  );

  const beginReviewOrApply = useCallback(
    async (items: PipelineCountItem[], transcript: string) => {
      const repos = await getRepositories();
      const catalog = await loadMatchableCatalog(repos);
      const reviewIndex = await findFirstReviewIndex(repos, items, 0, catalog);

      if (reviewIndex >= 0) {
        setPendingItems(items);
        setPendingIndex(reviewIndex);
        setLastTranscript(transcript);
        setStage('confirming');
        return;
      }

      await applyAllItems(items, transcript);
    },
    [applyAllItems]
  );

  const runPipeline = useCallback(
    async (transcript: string) => {
      setStageError(null);
      setLastTranscript(transcript);

      try {
        const repos = await getRepositories();
        const catalog = await loadMatchableCatalog(repos);
        const pipeline = await createVoicePipeline(
          async () => catalog,
          buildCatalogPrompt,
          { mockTranscript: transcript }
        );

        setStage('transcribing');
        const result = await pipeline.runFromTranscript(transcript, catalog);

        if (result.items.length === 0) {
          setStage('idle');
          Alert.alert('Nothing parsed', 'Try speaking an item name and quantity.');
          return;
        }

        await beginReviewOrApply(result.items, transcript);
      } catch (error) {
        setStage('error');
        setStageError(error instanceof Error ? error.message : 'Voice pipeline failed');
      }
    },
    [beginReviewOrApply]
  );

  const pipelineBusy = useMemo(
    () => ['transcribing', 'parsing', 'matching', 'applying'].includes(stage),
    [stage]
  );

  const handlePressIn = async () => {
    if (pipelineBusy || stage === 'confirming') return;
    setStageError(null);
    setStage('recording');
    await recorder.startRecording();
  };

  const handlePressOut = async () => {
    if (!recorder.isRecording && stage !== 'recording') return;

    const uri = await recorder.stopRecording();
    if (!uri) {
      setStage('idle');
      return;
    }

    try {
      const repos = await getRepositories();
      const catalog = await loadMatchableCatalog(repos);
      const mockPhrase = profile.mockPhrases[mockPhraseIndex % profile.mockPhrases.length];
      setMockPhraseIndex((i) => i + 1);

      const pipeline = await createVoicePipeline(async () => catalog, buildCatalogPrompt, {
        mockTranscript: mockPhrase,
      });

      setStage('transcribing');
      const result = await pipeline.run(uri);

      if (result.items.length === 0) {
        setStage('idle');
        Alert.alert(
          'Nothing parsed',
          `Heard: "${result.transcript}"\n\nTry saying the spirit name then quantity, e.g. "Belvedere 2".`
        );
        return;
      }

      await beginReviewOrApply(result.items, result.transcript);
    } catch (error) {
      setStage('error');
      setStageError(error instanceof Error ? error.message : 'Voice pipeline failed');
    } finally {
      await recorder.cleanupRecording(uri);
    }
  };

  const handleConfirmCurrent = async () => {
    if (!currentPending || !lastTranscript) return;

    const updated = pendingItems.map((item, index) =>
      index === pendingIndex
        ? {
            ...item,
            selectedItemId:
              item.selectedItemId ?? item.match.best?.itemId ?? currentPending.match.best?.itemId,
          }
        : item
    );
    setPendingItems(updated);

    const repos = await getRepositories();
    const catalog = await loadMatchableCatalog(repos);
    const nextReviewIndex = await findFirstReviewIndex(repos, updated, pendingIndex + 1, catalog);

    if (nextReviewIndex >= 0) {
      setPendingIndex(nextReviewIndex);
      return;
    }

    await applyAllItems(updated, lastTranscript);
  };

  const handleCancelAll = () => {
    setPendingItems([]);
    setPendingIndex(0);
    setResolvedItem(null);
    setBomPreview([]);
    setStage('idle');
    setStageError(null);
  };

  const handleSkipCurrent = async () => {
    const updated = pendingItems.map((item, index) =>
      index === pendingIndex ? { ...item, skipped: true } : item
    );
    setPendingItems(updated);

    const repos = await getRepositories();
    const catalog = await loadMatchableCatalog(repos);
    const nextReviewIndex = await findFirstReviewIndex(repos, updated, pendingIndex + 1, catalog);

    if (nextReviewIndex >= 0) {
      setPendingIndex(nextReviewIndex);
      return;
    }

    if (lastTranscript) {
      await applyAllItems(updated, lastTranscript);
      return;
    }

    setPendingItems([]);
    setPendingIndex(0);
    setStage('idle');
  };

  const handleUndo = async () => {
    const activeSession = session ?? (await ensureSession());
    const repos = await getRepositories();
    const last = await repos.countEvents.getLastForSession(activeSession.id);
    if (!last) {
      Alert.alert('Nothing to undo');
      return;
    }
    await repos.countEvents.delete(last.id);
    setUndoMessage('Undid last count');
    await loadTotals(activeSession.id);
    setTimeout(() => setUndoMessage(null), 2500);
  };

  const handleSimulate = async () => {
    const phrase = profile.mockPhrases[mockPhraseIndex % profile.mockPhrases.length];
    setMockPhraseIndex((i) => i + 1);
    await runPipeline(phrase);
  };

  const updatePending = (patch: Partial<PipelineCountItem>) => {
    if (!currentPending) return;
    const updated = [...pendingItems];
    updated[pendingIndex] = { ...currentPending, ...patch };
    setPendingItems(updated);
  };

  const handleFillLevelChange = async (fillLevel: number) => {
    updatePending({ fillLevelOverride: fillLevel, quantityOverride: fillLevel });
    if (resolvedItem?.is_batch && profile.features.fillLevel) {
      const repos = await getRepositories();
      const preview = await explodeBatchCount(repos, resolvedItem, fillLevel);
      setBomPreview(preview);
    }
  };

  const stageLabel: Record<VoicePipelineStage, string> = {
    idle: 'Ready',
    recording: 'Recording…',
    transcribing: 'Transcribing…',
    parsing: 'Parsing…',
    matching: 'Matching…',
    confirming: 'Review count',
    applying: 'Saving…',
    error: 'Error',
  };

  const isBusy = pipelineBusy || stage === 'recording';
  const statusColor =
    stage === 'error' ? colors.danger : isBusy ? colors.warning : colors.success;

  return (
    <Screen
      eyebrow="Voice stock take"
      title="Stock Take"
      subtitle={session ? session.name : 'No active session — one starts on first count'}
      scroll={stage === 'confirming'}
      right={
        <View style={[styles.statusChip, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusChipText, { color: statusColor }]} accessibilityLiveRegion="polite">
            {stageLabel[stage]}
          </Text>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <PushToTalkButton
            isRecording={recorder.isRecording}
            disabled={pipelineBusy || sessionLoading || stage === 'confirming'}
            durationMs={recorder.durationMs}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
        </View>
      }
    >
      {undoMessage ? <StatusMessage message={undoMessage} variant="success" live /> : null}
      {stageError ? <StatusMessage message={stageError} variant="error" live /> : null}
      {recorder.error ? <StatusMessage message={recorder.error} variant="error" live /> : null}
      {lastTranscript ? (
        <View style={styles.transcriptChip}>
          <Ionicons name="chatbubble-ellipses" size={16} color={colors.accent} />
          <Text style={styles.transcript}>&quot;{lastTranscript}&quot;</Text>
        </View>
      ) : null}

      {currentPending && stage === 'confirming' ? (
        <CountConfirmCard
          parsedName={currentPending.parsedName}
          quantity={getEffectiveQuantity(currentPending)}
          unit={currentPending.unit}
          parsedColor={currentPending.parsedColor}
          parsedSize={currentPending.parsedSize}
          parsedSku={currentPending.parsedSku}
          item={resolvedItem}
          candidates={getMatchCandidates(currentPending.match)}
          selectedItemId={currentPending.selectedItemId}
          showMatchPicker={currentPending.needsConfirmation}
          itemIndex={pendingIndex}
          itemTotal={pendingItems.filter((i) => !i.skipped).length}
          showFillLevel={profile.features.fillLevel}
          bomPreview={bomPreview}
          onCancelAll={handleCancelAll}
          onSelectItem={async (itemId) => {
            updatePending({ selectedItemId: itemId });
            const repos = await getRepositories();
            const item = await repos.items.getById(itemId);
            setResolvedItem(item);
            if (item?.is_batch && profile.features.fillLevel) {
              const fill =
                currentPending.fillLevelOverride ??
                (currentPending.quantity <= 1 ? currentPending.quantity : 0.5);
              const preview = await explodeBatchCount(repos, item, fill);
              setBomPreview(preview);
            }
          }}
          onQuantityChange={(quantity) => updatePending({ quantityOverride: quantity })}
          onFillLevelChange={handleFillLevelChange}
          onConfirm={handleConfirmCurrent}
          onCancel={handleSkipCurrent}
        />
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Session totals</Text>
          <Button label="Undo" variant="ghost" icon="arrow-undo" onPress={handleUndo} />
        </View>
        <Card style={styles.totalsCard}>
          <SessionTotalsList rows={totals} />
        </Card>
      </View>

      <View style={styles.quickActions}>
        <Button
          label="Simulate"
          variant="secondary"
          icon="sparkles"
          onPress={handleSimulate}
          style={styles.quickAction}
        />
        <Link href="/scan" asChild>
          <Button
            label="Scan"
            variant="secondary"
            icon="barcode-outline"
            onPress={() => {}}
            style={styles.quickAction}
          />
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusChipText: {
    ...typography.caption,
    fontWeight: '700',
  },
  transcriptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  transcript: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  section: {
    flex: 1,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  totalsCard: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
  },
});
