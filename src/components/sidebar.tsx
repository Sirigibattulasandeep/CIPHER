'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const navigation = [
  { href: '/', label: 'Overview' },
  { href: '/brands', label: 'Brand profiles' },
  { href: '/monitoring', label: 'Social & Apps' },
  { href: '/domains', label: 'Websites & domains' },
  { href: '/findings', label: 'Findings' },
  { href: '/investigations', label: 'Investigations' },
] as const;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login' as never); router.refresh();
  }
  if (pathname === '/login') return null;
  return <>
    <button aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(value => !value)} className="fixed right-4 top-4 z-20 rounded-lg border border-line bg-panel p-2 text-cyan md:hidden">☰</button>
    {open && <button aria-label="Close navigation menu" className="fixed inset-0 z-10 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`${open ? 'block' : 'hidden'} fixed z-20 h-full w-64 border-r border-line bg-[#0b1727] p-5 md:sticky md:top-0 md:block md:h-screen`}>
      <div className="mb-10"><div className="text-xl font-black tracking-[.22em] text-white">SENTRIX</div><div className="mt-1 text-[10px] uppercase tracking-[.18em] text-cyan">by Team CIPHER</div></div>
      <nav aria-label="Primary navigation" className="space-y-1 text-sm">{navigation.map(item => <Link key={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-slate-300 hover:bg-white/5 hover:text-cyan focus-visible:text-cyan" href={item.href}>{item.label}</Link>)}</nav>
      <button onClick={signOut} className="mt-5 w-full rounded-lg px-3 py-3 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-cyan">Sign out</button>
      <div className="absolute bottom-7 left-5 right-5 border-t border-line pt-4 text-xs muted">Detect Threats.<br />Defend Trust.</div>
    </aside>
  </>;
}
