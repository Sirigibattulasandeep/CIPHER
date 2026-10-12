'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navigation = [
  { href: '/', label: 'Overview', glyph: '◫' },
  { href: '/brands', label: 'Brand profiles', glyph: '◇' },
  { href: '/monitoring', label: 'Social & Apps', glyph: '◎' },
  { href: '/domains', label: 'Websites & domains', glyph: '↗' },
  { href: '/findings', label: 'Findings', glyph: '⌁' },
  { href: '/investigations', label: 'Investigations', glyph: '◷' },
] as const;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); }
    finally { router.replace('/login' as never); router.refresh(); }
  }
  if (pathname === '/login') return null;
  return <>
    <button aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(value => !value)} className="fixed right-4 top-4 z-20 rounded-lg border border-line bg-panel p-2 text-cyan md:hidden">☰</button>
    {open && <button aria-label="Close navigation menu" className="fixed inset-0 z-10 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`${open ? 'block' : 'hidden'} fixed z-20 h-full w-64 border-r border-line bg-[#0b1727] p-5 shadow-2xl shadow-black/20 md:sticky md:top-0 md:block md:h-screen md:shadow-none`}>
      <Link href="/" onClick={() => setOpen(false)} className="mb-9 flex items-center gap-3 rounded-xl focus-visible:outline-offset-4">
        <span className="login-brand-mark !h-10 !w-10 !rounded-xl !text-sm" aria-hidden="true">S</span>
        <span><span className="block text-lg font-black tracking-[.18em] text-white">SENTRIX</span><span className="mt-0.5 block text-[9px] uppercase tracking-[.18em] text-cyan">by Team CIPHER</span></span>
      </Link>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.17em] text-slate-500">Workspace</div>
      <nav aria-label="Primary navigation" className="space-y-1 text-sm">{navigation.map(item => {
        const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        return <Link key={item.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined} className="sidebar-link rounded-xl px-3 py-3" href={item.href}><span aria-hidden="true" className="sidebar-icon text-base">{item.glyph}</span><span>{item.label}</span></Link>;
      })}</nav>
      <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-line bg-[#0d1b2c] p-3">
        <div className="mb-2 flex items-center gap-2 px-1"><span className="status-pulse" aria-hidden="true"/><span className="text-xs font-medium text-slate-300">Workspace session</span></div>
        <button disabled={signingOut} onClick={signOut} className="w-full rounded-lg px-2 py-2 text-left text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-60">{signingOut ? 'Signing out…' : 'Sign out'}</button>
      </div>
    </aside>
  </>;
}
