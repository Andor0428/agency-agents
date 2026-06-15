import { getRepositories } from '@/services/db';
import type { Repositories } from '@/services/db/repositories';
import { loadSettings } from '@/config/settings';
import type { SyncQueueEntry } from '@/types';
import { isOnline } from './connectivity';
import { createSpreadsheetSyncService } from './createService';
import { buildSpreadsheetUpdatesForSession } from './sessionTotals';
import type { FlushSyncResult, SpreadsheetConflict, SpreadsheetSyncService } from './types';

type CountEventPayload = {
  sessionId: string;
};

function parseSessionId(entry: SyncQueueEntry): string | null {
  try {
    const payload = JSON.parse(entry.payload) as CountEventPayload;
    return payload.sessionId ?? null;
  } catch {
    return null;
  }
}

function groupBySession(entries: SyncQueueEntry[]): Map<string, SyncQueueEntry[]> {
  const groups = new Map<string, SyncQueueEntry[]>();
  for (const entry of entries) {
    const sessionId = parseSessionId(entry);
    if (!sessionId) continue;
    const list = groups.get(sessionId) ?? [];
    list.push(entry);
    groups.set(sessionId, list);
  }
  return groups;
}

export async function flushSyncQueue(
  repos: Repositories,
  service: SpreadsheetSyncService
): Promise<FlushSyncResult> {
  const pending = await repos.syncQueue.getPending();
  if (pending.length === 0) {
    return { processed: 0, completed: 0, failed: 0, conflicts: [] };
  }

  const groups = groupBySession(pending);
  const allConflicts: SpreadsheetConflict[] = [];
  let completed = 0;
  let failed = 0;

  for (const [sessionId, entries] of groups) {
    try {
      const updates = await buildSpreadsheetUpdatesForSession(repos, sessionId);
      const result = await service.writeTotals(updates);
      allConflicts.push(...result.conflicts);

      for (const entry of entries) {
        await repos.syncQueue.updateStatus(entry.id, 'completed');
        completed++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      for (const entry of entries) {
        await repos.syncQueue.updateStatus(entry.id, 'failed', true);
        failed++;
      }
      return {
        processed: pending.length,
        completed,
        failed,
        conflicts: allConflicts,
        error: message,
      };
    }
  }

  const orphaned = pending.filter((entry) => !parseSessionId(entry));
  for (const entry of orphaned) {
    await repos.syncQueue.updateStatus(entry.id, 'failed', true);
    failed++;
  }

  return {
    processed: pending.length,
    completed,
    failed,
    conflicts: allConflicts,
  };
}

export async function triggerBackgroundSync(): Promise<FlushSyncResult | null> {
  try {
    const online = await isOnline();
    if (!online) return null;

    const settings = await loadSettings();
    if (settings.spreadsheetProvider === 'none') return null;

    const service = await createSpreadsheetSyncService();
    const repos = await getRepositories();
    const pending = await repos.syncQueue.getPending();
    if (pending.length === 0) return null;

    return await flushSyncQueue(repos, service);
  } catch (error) {
    console.warn('[sync] background flush failed', error);
    return null;
  }
}
