import type * as SQLite from 'expo-sqlite';
import { ItemsRepository } from './items';
import { AliasesRepository } from './aliases';
import { SessionsRepository } from './sessions';
import { CountEventsRepository } from './countEvents';
import { SyncQueueRepository } from './syncQueue';

export type Repositories = {
  items: ItemsRepository;
  aliases: AliasesRepository;
  sessions: SessionsRepository;
  countEvents: CountEventsRepository;
  syncQueue: SyncQueueRepository;
};

export function createRepositories(db: SQLite.SQLiteDatabase): Repositories {
  return {
    items: new ItemsRepository(db),
    aliases: new AliasesRepository(db),
    sessions: new SessionsRepository(db),
    countEvents: new CountEventsRepository(db),
    syncQueue: new SyncQueueRepository(db),
  };
}
