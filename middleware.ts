import { NextRequest, NextResponse } from 'next/server';

async function hasValidSession(value?: string) {
  const secret = process.env.SESSION_SECRET;
  if (!value || !secret || secret.length < 32) return false;
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return false;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const decode = (part: string) => atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const payload = Uint8Array.from(decode(signature), char => char.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, payload, new TextEncoder().encode(encoded));
    if (!valid) return false;
    const session = JSON.parse(decode(encoded));
    return typeof session.email === 'string' && session.expiresAt > Date.now();
  } catch { return false; }
}

export function middleware(request: NextRequest) {
  const authenticated = await hasValidSession(request.cookies.get('sentrix_session')?.value);
  const isLogin = request.nextUrl.pathname === '/login';
  if (!authenticated && !isLogin) {
    if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authenticated && isLogin) return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/login).*)'] };
