import { Router } from 'express';
import { requireAdmin, requireViewToken } from '../middleware/auth.js';
import { loginAdmin } from '../services/adminAuth.js';
import { getAuditForSession, writeAudit } from '../services/audit.js';
import { notifySupportSessionEvent } from '../services/alerts.js';
import {
  authenticateViewToken,
  getLatestSnapshot,
  getSessionForAdmin,
  redeemSupportCode,
} from '../services/supportSessions.js';
import {
  listChangeRequests,
  proposeChangeRequest,
} from '../services/changeRequests.js';
import { addSupportNote, listSupportNotes } from '../services/supportNotes.js';

export const adminRouter = Router();

adminRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  const result = loginAdmin(String(email), String(password));
  if (!result) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({ token: result.token, role: result.role });
});

adminRouter.use(requireAdmin);

adminRouter.post('/support/redeem', (req, res) => {
  const { code } = req.body ?? {};
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  try {
    const result = redeemSupportCode(String(code), req.admin!.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Redeem failed',
    });
  }
});

adminRouter.get('/support/sessions/:sessionId', (req, res) => {
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string' || !authenticateViewToken(req.params.sessionId, viewToken)) {
    res.status(401).json({ error: 'Valid view token required' });
    return;
  }

  const session = getSessionForAdmin(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  writeAudit(req.params.sessionId, 'admin', req.admin!.id, 'session_viewed');
  notifySupportSessionEvent(req.params.sessionId, 'support_session_viewed', {
    adminId: req.admin!.id,
  });
  const snapshot = getLatestSnapshot(req.params.sessionId);
  res.json({ session, snapshot, readOnly: true });
});

adminRouter.get('/support/sessions/:sessionId/audit', requireViewToken, (req, res) => {
  writeAudit(req.params.sessionId, 'admin', req.admin!.id, 'audit_viewed');
  res.json({ entries: getAuditForSession(req.params.sessionId) });
});

adminRouter.get('/support/sessions/:sessionId/change-requests', (req, res) => {
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string' || !authenticateViewToken(req.params.sessionId, viewToken)) {
    res.status(401).json({ error: 'Valid view token required' });
    return;
  }
  res.json({ requests: listChangeRequests(req.params.sessionId) });
});

adminRouter.post('/support/sessions/:sessionId/change-requests', (req, res) => {
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string' || !authenticateViewToken(req.params.sessionId, viewToken)) {
    res.status(401).json({ error: 'Valid view token required' });
    return;
  }

  const {
    countSessionId,
    countSessionName,
    itemId,
    itemName,
    currentQty,
    proposedQty,
    reason,
  } = req.body ?? {};

  if (!countSessionId || !itemId || !itemName) {
    res.status(400).json({ error: 'countSessionId, itemId, and itemName are required' });
    return;
  }

  try {
    const request = proposeChangeRequest(req.params.sessionId, req.admin!.id, {
      countSessionId: String(countSessionId),
      countSessionName: String(countSessionName ?? 'Session'),
      itemId: String(itemId),
      itemName: String(itemName),
      currentQty: Number(currentQty),
      proposedQty: Number(proposedQty),
      reason: typeof reason === 'string' ? reason : undefined,
    });
    res.status(201).json({ request });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Could not propose change',
    });
  }
});

adminRouter.get('/support/sessions/:sessionId/notes', (req, res) => {
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string' || !authenticateViewToken(req.params.sessionId, viewToken)) {
    res.status(401).json({ error: 'Valid view token required' });
    return;
  }
  res.json({ notes: listSupportNotes(req.params.sessionId) });
});

adminRouter.post('/support/sessions/:sessionId/notes', (req, res) => {
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string' || !authenticateViewToken(req.params.sessionId, viewToken)) {
    res.status(401).json({ error: 'Valid view token required' });
    return;
  }
  const noteText = req.body?.noteText;
  if (!noteText || typeof noteText !== 'string') {
    res.status(400).json({ error: 'noteText is required' });
    return;
  }
  const note = addSupportNote(req.params.sessionId, req.admin!.id, noteText);
  res.status(201).json({ note });
});
