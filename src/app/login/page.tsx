'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(response.status === 503
          ? 'Sign-in has not been set up for this workspace yet. Please contact your administrator.'
          : response.status === 401
            ? 'That email and password do not match. Check them and try again.'
            : result.error ?? 'We could not sign you in. Please try again.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('We could not reach the sign-in service. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-layout">
    <section className="login-card">
      <Link href="/" className="login-brand w-fit rounded-xl focus-visible:outline-offset-4">
        <span className="login-brand-mark" aria-hidden="true">S</span>
        <span><span className="block text-lg font-black tracking-[.18em] text-white">SENTRIX</span><span className="mt-0.5 block text-[9px] uppercase tracking-[.18em] text-cyan">by Team CIPHER</span></span>
      </Link>
      <p className="eyebrow mt-10">Your digital risk workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
      <p className="muted mt-2 text-sm leading-6">Sign in to review findings and keep your brand information close at hand.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-200">Work email</label><input className="field" id="email" name="email" type="email" autoComplete="username" autoFocus required /></div>
        <div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-200">Password</label><input className="field" id="password" name="password" type="password" autoComplete="current-password" required /></div>
        {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/[.08] p-3 text-sm leading-5 text-red-200">{error}</p>}
        <button className="btn btn-primary w-full disabled:cursor-wait disabled:opacity-60" disabled={busy} aria-live="polite">{busy ? 'Signing you in…' : 'Sign in'}<span aria-hidden="true">→</span></button>
      </form>
      <div className="login-helper mt-6"><strong className="font-semibold text-slate-300">A note about this workspace</strong><br />Only records saved here appear in your dashboard. Imported and sample records are labeled so you can tell them apart.</div>
      <p className="mt-6 text-center text-[11px] text-slate-500">Secure access to your SENTRIX workspace</p>
    </section>
  </main>;
}
