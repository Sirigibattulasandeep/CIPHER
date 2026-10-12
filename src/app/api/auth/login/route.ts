import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE } from '@/lib/session';

export async function POST(request: Request) {
  const email = process.env.SENTRIX_LOGIN_EMAIL;
  const password = process.env.SENTRIX_LOGIN_PASSWORD;
  if (!email || !password || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Login is not configured on this server.' }, { status: 503 });
  }
  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (body.email?.trim().toLowerCase() !== email.trim().toLowerCase() || body.password !== password) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  const session = createSession(email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.value, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: session.maxAge });
  return response;
}
