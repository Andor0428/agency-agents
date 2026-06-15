import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySecret(value: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(value, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateSupportCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function signPayload(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHash('sha256').update(`${body}.${secret}`).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySignedPayload<T extends Record<string, unknown>>(
  token: string,
  secret: string
): T | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHash('sha256').update(`${body}.${secret}`).digest('base64url');
  if (sig.length !== expected.length) return null;
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (!timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
