import { Router } from 'express';
import { requireAdmin, requireSupervisor } from '../middleware/auth.js';
import { listOrganizations } from '../services/organizations.js';
import {
  auditLogToCsv,
  exportAuditLog,
  listAllSupportSessions,
} from '../services/supervisor.js';

export const supervisorRouter = Router();

supervisorRouter.use(requireAdmin, requireSupervisor);

supervisorRouter.get('/organizations', (_req, res) => {
  res.json({ organizations: listOrganizations() });
});

supervisorRouter.get('/sessions', (_req, res) => {
  res.json({ sessions: listAllSupportSessions() });
});

supervisorRouter.get('/audit', (req, res) => {
  const entries = exportAuditLog();
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="support-audit.csv"');
    res.send(auditLogToCsv(entries));
    return;
  }
  res.json({ entries });
});
