import type { NextFunction, Request, Response } from 'express';
import { verifyAdminToken } from '../services/adminAuth.js';
import { authenticateDevice, authenticateViewToken } from '../services/supportSessions.js';

export type AuthedAdmin = { id: string; email: string; role: string };

declare global {
  namespace Express {
    interface Request {
      admin?: AuthedAdmin;
      device?: { id: string; orgId: string };
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing admin token' });
    return;
  }
  const token = header.slice('Bearer '.length);
  const admin = verifyAdminToken(token);
  if (!admin) {
    res.status(401).json({ error: 'Invalid or expired admin token' });
    return;
  }
  req.admin = { id: admin.sub, email: admin.email, role: admin.role };
  next();
}

export function requireDevice(req: Request, res: Response, next: NextFunction): void {
  const deviceId = req.headers['x-device-id'];
  const deviceSecret = req.headers['x-device-secret'];
  if (typeof deviceId !== 'string' || typeof deviceSecret !== 'string') {
    res.status(401).json({ error: 'Missing device credentials' });
    return;
  }
  const device = authenticateDevice(deviceId, deviceSecret);
  if (!device) {
    res.status(401).json({ error: 'Invalid device credentials' });
    return;
  }
  req.device = { id: device.id, orgId: device.org_id };
  next();
}

export function requireViewToken(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.params.sessionId;
  const viewToken = req.headers['x-view-token'];
  if (typeof viewToken !== 'string') {
    res.status(401).json({ error: 'Missing view token' });
    return;
  }
  if (!authenticateViewToken(sessionId, viewToken)) {
    res.status(401).json({ error: 'Invalid view token' });
    return;
  }
  next();
}
