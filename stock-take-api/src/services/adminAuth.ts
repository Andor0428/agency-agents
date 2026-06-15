import { getDb } from '../db.js';
import { signPayload, verifySecret, verifySignedPayload } from '../crypto.js';
import { config } from '../config.js';

type AdminTokenPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
};

export function loginAdmin(email: string, password: string): { token: string; role: string } | null {
  const db = getDb();
  const row = db
    .prepare('SELECT id, email, password_hash, role FROM admin_users WHERE email = ?')
    .get(email) as
    | { id: string; email: string; password_hash: string; role: string }
    | undefined;
  if (!row || !verifySecret(password, row.password_hash)) return null;

  const payload: AdminTokenPayload = {
    sub: row.id,
    email: row.email,
    role: row.role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  return { token: signPayload(payload, config.apiSecret), role: row.role };
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const payload = verifySignedPayload<AdminTokenPayload>(token, config.apiSecret);
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  return payload;
}
