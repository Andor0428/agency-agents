import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { SyncQueueEntry, SyncQueueStatus } from '@/types';
import { mapSyncQueueRow } from '../mappers';

export class SyncQueueRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async enqueue(entity: string, payload: Record<string, unknown>): Promise<SyncQueueEntry> {
    const now = new Date().toISOString();
    const entry: SyncQueueEntry = {
      id: uuidv4(),
      entity,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      created_at: now,
      updated_at: now,
    };

    await this.db.runAsync(
      `INSERT INTO sync_queue (id, entity, payload, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.entity,
        entry.payload,
        entry.status,
        entry.attempts,
        entry.created_at,
        entry.updated_at,
      ]
    );

    return entry;
  }

  async getPending(limit = 50): Promise<SyncQueueEntry[]> {
    const rows = await this.db.getAllAsync<SyncQueueEntry>(
      "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?",
      [limit]
    );
    return rows.map(mapSyncQueueRow);
  }

  async updateStatus(id: string, status: SyncQueueStatus, incrementAttempts = false): Promise<void> {
    const now = new Date().toISOString();
    if (incrementAttempts) {
      await this.db.runAsync(
        'UPDATE sync_queue SET status = ?, attempts = attempts + 1, updated_at = ? WHERE id = ?',
        [status, now, id]
      );
    } else {
      await this.db.runAsync('UPDATE sync_queue SET status = ?, updated_at = ? WHERE id = ?', [
        status,
        now,
        id,
      ]);
    }
  }

  async getFailed(limit = 50): Promise<SyncQueueEntry[]> {
    const rows = await this.db.getAllAsync<SyncQueueEntry>(
      "SELECT * FROM sync_queue WHERE status = 'failed' ORDER BY updated_at DESC LIMIT ?",
      [limit]
    );
    return rows.map(mapSyncQueueRow);
  }

  async retryFailed(): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db.runAsync(
      "UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE status = 'failed'",
      [now]
    );
    return result.changes ?? 0;
  }

  async getStatusCounts(): Promise<Record<SyncQueueStatus, number>> {
    const rows = await this.db.getAllAsync<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM sync_queue GROUP BY status'
    );
    const counts: Record<SyncQueueStatus, number> = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    for (const row of rows) {
      counts[row.status as SyncQueueStatus] = row.count;
    }
    return counts;
  }
}
