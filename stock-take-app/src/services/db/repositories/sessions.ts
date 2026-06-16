import { createId as uuidv4 } from '@/utils/uuid';
import type * as SQLite from 'expo-sqlite';
import type { CountSession, SessionStatus, StorageLocation } from '@/types';
import { mapSessionRow } from '../mappers';

export class SessionsRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async getAll(): Promise<CountSession[]> {
    const rows = await this.db.getAllAsync<CountSession>(
      'SELECT * FROM count_sessions ORDER BY started_at DESC'
    );
    return rows.map(mapSessionRow);
  }

  async getOpen(): Promise<CountSession | null> {
    const row = await this.db.getFirstAsync<CountSession>(
      "SELECT * FROM count_sessions WHERE status = 'open' ORDER BY started_at DESC LIMIT 1"
    );
    return row ? mapSessionRow(row) : null;
  }

  async getById(id: string): Promise<CountSession | null> {
    const row = await this.db.getFirstAsync<CountSession>(
      'SELECT * FROM count_sessions WHERE id = ?',
      [id]
    );
    return row ? mapSessionRow(row) : null;
  }

  async create(name: string, location: StorageLocation = 'bar'): Promise<CountSession> {
    const session: CountSession = {
      id: uuidv4(),
      name,
      location,
      status: 'open',
      started_at: new Date().toISOString(),
      closed_at: null,
    };
    await this.db.runAsync(
      `INSERT INTO count_sessions (id, name, location, status, started_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, session.name, session.location, session.status, session.started_at, session.closed_at]
    );
    return session;
  }

  async close(id: string): Promise<CountSession | null> {
    const closedAt = new Date().toISOString();
    await this.db.runAsync(
      "UPDATE count_sessions SET status = 'closed', closed_at = ? WHERE id = ?",
      [closedAt, id]
    );
    return this.getById(id);
  }

  async setStatus(id: string, status: SessionStatus): Promise<void> {
    const closedAt = status === 'closed' ? new Date().toISOString() : null;
    await this.db.runAsync('UPDATE count_sessions SET status = ?, closed_at = ? WHERE id = ?', [
      status,
      closedAt,
      id,
    ]);
  }
}
