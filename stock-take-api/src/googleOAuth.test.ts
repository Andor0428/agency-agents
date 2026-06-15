import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './db.js';
import {
  clearGoogleConnection,
  getGoogleConnection,
  saveGoogleConnection,
} from './services/googleOAuth.js';
import { registerDevice } from './services/supportSessions.js';

const tmpDb = path.join(os.tmpdir(), `stock-take-api-m14-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;

test.after(() => {
  closeDb();
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
});

test('org google connection save and clear', () => {
  const { orgId } = registerDevice({ orgName: 'Sheet Store', businessType: 'retail' });

  saveGoogleConnection(orgId, {
    refreshToken: 'refresh-abc',
    accessToken: 'access-xyz',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    spreadsheetId: 'sheet123',
    sheetName: 'Inventory',
  });

  const connection = getGoogleConnection(orgId);
  assert.equal(connection?.spreadsheetId, 'sheet123');
  assert.equal(connection?.sheetName, 'Inventory');

  clearGoogleConnection(orgId);
  assert.equal(getGoogleConnection(orgId), null);
});
