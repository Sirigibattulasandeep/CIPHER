'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? 'Unable to sign in.'); return; }
      router.replace('/'); router.refresh();
    } catch { setError('Unable to reach the sign-in service. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center px-5 py-12">
    <section className="surface w-full max-w-md p-8 sm:p-10">
      <Link href="/" className="text-xl font-black tracking-[.22em] text-white">SENTRIX</Link>
      <p className="mt-2 text-xs uppercase tracking-[.18em] text-cyan">by Team CIPHER</p>
      <h1 className="mt-10 text-2xl font-bold text-white">Welcome back</h1>
      <p className="muted mt-2 text-sm">Sign in to your digital risk workspace.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div><label htmlFor="email" className="mb-2 block text-sm font-semibold">Work email</label><input className="field" id="email" name="email" type="email" autoComplete="username" required /></div>
        <div><label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
        {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-60" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section>
  </main>;
}
