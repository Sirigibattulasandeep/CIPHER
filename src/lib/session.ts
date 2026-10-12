import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'sentrix_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type Session = { email: string; expiresAt: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters.');
  return value;
}

export function createSession(email: string) {
  const payload: Session = { email, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return { value: `${encoded}.${signature}`, maxAge: SESSION_TTL_SECONDS };
}

export function verifySession(value: string | undefined): Session | null {
  if (!value) return null;
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return null;
  try {
    const expected = createHmac('sha256', secret()).update(encoded).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const session = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as Session;
    return session.email && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}
