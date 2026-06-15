import { getRepositories } from '@/services/db';
import { loadSettings } from '@/config/settings';
import { isOnline } from './connectivity';
import { createSpreadsheetSyncService } from './createService';
import { flushSyncQueue } from './flush';
import { buildSpreadsheetUpdatesForSession } from './sessionTotals';
import type { FlushSyncResult } from './types';

export type SessionCloseSyncResult = FlushSyncResult & {
  skipped?: boolean;
  reason?: string;
};

export async function syncOnSessionClose(sessionId: string): Promise<SessionCloseSyncResult> {
  try {
    const settings = await loadSettings();
    if (settings.spreadsheetProvider === 'none') {
      return { processed: 0, completed: 0, failed: 0, conflicts: [], skipped: true, reason: 'no_provider' };
    }

    const online = await isOnline();
    if (!online) {
      return { processed: 0, completed: 0, failed: 0, conflicts: [], skipped: true, reason: 'offline' };
    }

    const repos = await getRepositories();
    const updates = await buildSpreadsheetUpdatesForSession(repos, sessionId);
    if (updates.length === 0) {
      return { processed: 0, completed: 0, failed: 0, conflicts: [], skipped: true, reason: 'empty_session' };
    }

    const service = await createSpreadsheetSyncService();
    const result = await flushSyncQueue(repos, service);
    return result;
  } catch (error) {
    console.warn('[sync] session close sync failed', error);
    return {
      processed: 0,
      completed: 0,
      failed: 0,
      conflicts: [],
      skipped: true,
      reason: error instanceof Error ? error.message : 'sync_failed',
    };
  }
}
