import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb } from './db.js';
import { createOrgLinkCode } from './services/orgLink.js';
import { registerDevice } from './services/supportSessions.js';

const tmpDb = path.join(os.tmpdir(), `stock-take-api-m13-${Date.now()}.db`);
process.env.DB_PATH = tmpDb;

test.after(() => {
  closeDb();
  if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
});

test('secondary device joins organization via link code', () => {
  const primary = registerDevice({ orgName: 'Main Store', businessType: 'retail' });
  const { code } = createOrgLinkCode(primary.deviceId);

  const secondary = registerDevice({
    orgName: 'Linked handset',
    businessType: 'retail',
    orgLinkCode: code,
    label: 'floor-2',
  });

  assert.equal(secondary.orgId, primary.orgId);
});
