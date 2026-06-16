import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { CountEvent } from '@/types';
import { mapCountEventRow } from '../mappers';

export type CreateCountEventInput = {
  sessionId: string;
  itemId: string;
  qty: number;
  fillLevel?: number | null;
  rawTranscript?: string;
  recipeVersion?: number | null;
  confidenceScore?: number;
};

export class CountEventsRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getBySession(sessionId: string): Promise<CountEvent[]> {
    const rows = await this.db.getAllAsync<CountEvent>(
      'SELECT * FROM count_events WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    return rows.map(mapCountEventRow);
  }

  async getBySessionAndItem(sessionId: string, itemId: string): Promise<CountEvent[]> {
    const rows = await this.db.getAllAsync<CountEvent>(
      'SELECT * FROM count_events WHERE session_id = ? AND item_id = ? ORDER BY created_at ASC',
      [sessionId, itemId]
    );
    return rows.map(mapCountEventRow);
  }

  async getSessionTotals(
    sessionId: string
  ): Promise<Array<{ item_id: string; total_qty: number; event_count: number }>> {
    return this.db.getAllAsync(
      `SELECT item_id, SUM(qty) as total_qty, COUNT(*) as event_count
       FROM count_events WHERE session_id = ?
       GROUP BY item_id`,
      [sessionId]
    );
  }

  async create(input: CreateCountEventInput): Promise<CountEvent> {
    const event: CountEvent = {
      id: uuidv4(),
      session_id: input.sessionId,
      item_id: input.itemId,
      qty: input.qty,
      fill_level: input.fillLevel ?? null,
      raw_transcript: input.rawTranscript ?? '',
      recipe_version: input.recipeVersion ?? null,
      confidence_score: input.confidenceScore ?? 0,
      created_at: new Date().toISOString(),
    };

    await this.db.runAsync(
      `INSERT INTO count_events (
        id, session_id, item_id, qty, fill_level, raw_transcript,
        recipe_version, confidence_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.session_id,
        event.item_id,
        event.qty,
        event.fill_level,
        event.raw_transcript,
        event.recipe_version,
        event.confidence_score,
        event.created_at,
      ]
    );

    return event;
  }

  async getLastForSession(sessionId: string): Promise<CountEvent | null> {
    const row = await this.db.getFirstAsync<CountEvent>(
      'SELECT * FROM count_events WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );
    return row ? mapCountEventRow(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.runAsync('DELETE FROM count_events WHERE id = ?', [id]);
    return (result.changes ?? 0) > 0;
  }
}
