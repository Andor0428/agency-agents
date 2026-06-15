import { Router } from 'express';
import { requireAdmin, requireViewToken } from '../middleware/auth.js';
import { loginAdmin } from '../services/adminAuth.js';
import { getAuditForSession, writeAudit } from '../services/audit.js';
import {
  authenticateViewToken,
  getLatestSnapshot,
  getSessionForAdmin,
  redeemSupportCode,
} from '../services/supportSessions.js';

export const adminRouter = Router();

adminRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'email and password required' });
    return;
  }
  const token = loginAdmin(String(email), String(password));
  if (!token) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({ token });
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
  const snapshot = getLatestSnapshot(req.params.sessionId);
  res.json({ session, snapshot, readOnly: true });
});

adminRouter.get('/support/sessions/:sessionId/audit', requireViewToken, (req, res) => {
  writeAudit(req.params.sessionId, 'admin', req.admin!.id, 'audit_viewed');
  res.json({ entries: getAuditForSession(req.params.sessionId) });
});
