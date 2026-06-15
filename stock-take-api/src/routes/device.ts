import { Router } from 'express';
import { requireDevice } from '../middleware/auth.js';
import {
  createSupportSession,
  getActiveSessionForDevice,
  registerDevice,
  revokeSupportSession,
  uploadSnapshot,
} from '../services/supportSessions.js';
import {
  listPendingForDevice,
  markChangeRequestApplied,
  resolveChangeRequest,
} from '../services/changeRequests.js';
import type { SupportSnapshotPayload } from '../types.js';

export const deviceRouter = Router();

deviceRouter.post('/register', (req, res) => {
  const { orgName, businessType, retailSubType, label } = req.body ?? {};
  if (!orgName || typeof orgName !== 'string') {
    res.status(400).json({ error: 'orgName is required' });
    return;
  }
  const result = registerDevice({
    orgName,
    businessType: typeof businessType === 'string' ? businessType : 'hospitality',
    retailSubType: typeof retailSubType === 'string' ? retailSubType : undefined,
    label: typeof label === 'string' ? label : undefined,
  });
  res.status(201).json(result);
});

deviceRouter.use(requireDevice);

deviceRouter.post('/support/sessions', (req, res) => {
  const result = createSupportSession(req.device!.id);
  res.status(201).json(result);
});

deviceRouter.get('/support/sessions/active', (req, res) => {
  const session = getActiveSessionForDevice(req.device!.id);
  res.json({ session });
});

deviceRouter.post('/support/sessions/:sessionId/snapshot', (req, res) => {
  const payload = req.body as SupportSnapshotPayload;
  if (!payload?.capturedAt) {
    res.status(400).json({ error: 'Invalid snapshot payload' });
    return;
  }
  try {
    uploadSnapshot(req.params.sessionId, req.device!.id, payload);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
});

deviceRouter.post('/support/sessions/:sessionId/revoke', (req, res) => {
  const ok = revokeSupportSession(req.params.sessionId, req.device!.id);
  if (!ok) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ ok: true });
});

deviceRouter.get('/support/change-requests/pending', (req, res) => {
  res.json({ requests: listPendingForDevice(req.device!.id) });
});

deviceRouter.post('/support/change-requests/:id/resolve', (req, res) => {
  const decision = req.body?.decision;
  if (decision !== 'approve' && decision !== 'deny') {
    res.status(400).json({ error: 'decision must be approve or deny' });
    return;
  }
  try {
    const request = resolveChangeRequest(req.params.id, req.device!.id, decision);
    res.json({ request });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Could not resolve request',
    });
  }
});

deviceRouter.post('/support/change-requests/:id/applied', (req, res) => {
  try {
    const request = markChangeRequestApplied(req.params.id, req.device!.id);
    res.json({ request });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Could not mark applied',
    });
  }
});
