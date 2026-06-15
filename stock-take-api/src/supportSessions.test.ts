import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './db.js';
import {
  createSupportSession,
  getLatestSnapshot,
  redeemSupportCode,
  registerDevice,
  uploadSnapshot,
} from './services/supportSessions.js';
import type { SupportSnapshotPayload } from './types.js';

const tmpDb = path.join(os.tmpdir(), `stock-take-api-test-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.API_SECRET = 'test-secret';

test.after(() => {
  closeDb();
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
});

test('support session redeem and read-only snapshot', () => {
  const { deviceId } = registerDevice({
    orgName: 'Test Bar',
    businessType: 'hospitality',
  });

  const { sessionId, code } = createSupportSession(deviceId);
  const payload: SupportSnapshotPayload = {
    capturedAt: new Date().toISOString(),
    store: { businessType: 'hospitality', storeName: 'Test Bar' },
    catalog: { itemCount: 1, items: [] },
    sessions: [],
    syncQueue: { pending: 0 },
  };
  uploadSnapshot(sessionId, deviceId, payload);

  const redeemed = redeemSupportCode(code, 'admin-1');
  assert.equal(redeemed.sessionId, sessionId);
  const snapshot = getLatestSnapshot(sessionId);
  assert.equal(snapshot?.store.storeName, 'Test Bar');
});
