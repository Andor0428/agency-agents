import { Router } from 'express';
import { requireDevice } from '../middleware/auth.js';
import {
  clearGoogleConnection,
  getGoogleConnection,
  getValidAccessToken,
  saveGoogleConnection,
} from '../services/googleOAuth.js';

export const googleRouter = Router();

googleRouter.use(requireDevice);

googleRouter.get('/status', (req, res) => {
  const connection = getGoogleConnection(req.device!.orgId);
  res.json({ connected: Boolean(connection), connection });
});

googleRouter.put('/connect', (req, res) => {
  const { refreshToken, accessToken, expiresAt, spreadsheetId, sheetName } = req.body ?? {};
  if (!refreshToken || !accessToken || !spreadsheetId) {
    res.status(400).json({ error: 'refreshToken, accessToken, and spreadsheetId are required' });
    return;
  }

  const connection = saveGoogleConnection(req.device!.orgId, {
    refreshToken: String(refreshToken),
    accessToken: String(accessToken),
    expiresAt: expiresAt ? String(expiresAt) : null,
    spreadsheetId: String(spreadsheetId),
    sheetName: typeof sheetName === 'string' && sheetName.trim() ? sheetName.trim() : 'Inventory',
  });
  res.json({ connection });
});

googleRouter.delete('/disconnect', (req, res) => {
  clearGoogleConnection(req.device!.orgId);
  res.json({ ok: true });
});

googleRouter.get('/access-token', async (req, res) => {
  const token = await getValidAccessToken(req.device!.orgId);
  if (!token) {
    res.status(404).json({ error: 'Google Sheets not connected or token refresh failed' });
    return;
  }
  const connection = getGoogleConnection(req.device!.orgId);
  res.json({ accessToken: token, connection });
});
