import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './db.js';
import {
  listPendingForDevice,
  markChangeRequestApplied,
  proposeChangeRequest,
  resolveChangeRequest,
} from './services/changeRequests.js';
import {
  createSupportSession,
  redeemSupportCode,
  registerDevice,
} from './services/supportSessions.js';

const tmpDb = path.join(os.tmpdir(), `stock-take-api-m12-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;
process.env.API_SECRET = 'test-secret';

test.after(() => {
  closeDb();
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
});

test('change request approve and apply flow', () => {
  const { deviceId } = registerDevice({
    orgName: 'Test Store',
    businessType: 'retail',
  });

  const { sessionId, code } = createSupportSession(deviceId);
  redeemSupportCode(code, 'admin-1');

  const proposed = proposeChangeRequest(sessionId, 'admin-1', {
    countSessionId: 'count-sess-1',
    countSessionName: 'Monday',
    itemId: 'item-1',
    itemName: 'T-Shirt',
    currentQty: 5,
    proposedQty: 7,
    reason: 'Fix duplicate scan',
  });

  assert.equal(proposed.status, 'pending');
  const pending = listPendingForDevice(deviceId);
  assert.equal(pending.length, 1);

  const approved = resolveChangeRequest(proposed.id, deviceId, 'approve');
  assert.equal(approved.status, 'approved');

  const applied = markChangeRequestApplied(proposed.id, deviceId);
  assert.equal(applied.status, 'applied');
  assert.ok(applied.appliedAt);
});

test('customer can deny change request', () => {
  const { deviceId } = registerDevice({
    orgName: 'Deny Store',
    businessType: 'hospitality',
  });
  const { sessionId, code } = createSupportSession(deviceId);
  redeemSupportCode(code, 'admin-2');

  const proposed = proposeChangeRequest(sessionId, 'admin-2', {
    countSessionId: 'sess',
    countSessionName: 'Bar',
    itemId: 'vodka',
    itemName: 'Vodka',
    currentQty: 2,
    proposedQty: 4,
  });

  const denied = resolveChangeRequest(proposed.id, deviceId, 'deny');
  assert.equal(denied.status, 'denied');
  assert.equal(listPendingForDevice(deviceId).length, 0);
});
