import Link from 'next/link';
import { listFindings } from '@/lib/findings-store';
import { listInvestigations } from '@/lib/investigations-store';

function sourceHref(source: string, brandId: string) {
  const page = source === 'DOMAIN' || source === 'WEBSITE' ? '/domains' : '/monitoring';
  return `${page}?brandId=${encodeURIComponent(brandId)}`;
}

export default async function InvestigationsPage() {
  const [investigations, findings] = await Promise.all([listInvestigations(), listFindings()]);
  const findingById = new Map(findings.map(finding => [finding.id, finding]));
  const open = investigations.filter(item => item.status !== 'CLOSED');
  const closed = investigations.filter(item => item.status === 'CLOSED');
  const card = (item: (typeof investigations)[number]) => {
    const finding = findingById.get(item.findingId);
    if (!finding) return null;
    return <article key={item.id} className="rounded-2xl border border-line bg-[#0b1727]/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-medium text-white">{finding.title}</h3><p className="mt-1 truncate text-sm muted">{finding.affectedEntity}</p></div><span className="rounded-full border border-line px-3 py-1 text-xs text-slate-300">{item.status.replaceAll('_', ' ').toLowerCase()}</span></div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400"><span>{finding.severity.toLowerCase()} severity</span><span aria-hidden="true">·</span><span>{item.notes.length} {item.notes.length === 1 ? 'note' : 'notes'}</span><span aria-hidden="true">·</span><span>Risk score {finding.riskScore}/100</span></div>
      <Link href={sourceHref(finding.source, item.brandId) as never} className="quiet-link mt-4 inline-flex text-sm">Continue review <span aria-hidden="true" className="ml-1">→</span></Link>
    </article>;
  };

  return <div className="page-shell">
    <header className="mb-7"><p className="eyebrow">Case work</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Investigations</h1><p className="mt-2 max-w-2xl text-sm leading-6 muted">Keep notes and follow-up work together while your team reviews a finding.</p></header>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="surface p-5 sm:p-6" aria-labelledby="open-cases"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 id="open-cases" className="text-lg font-semibold text-white">In progress</h2><p className="mt-1 text-sm muted">{open.length} {open.length === 1 ? 'case' : 'cases'} need follow-up</p></div><span className="grid h-9 min-w-9 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[.06] px-2 text-sm font-semibold text-amber-200">{open.length}</span></div>
        {open.length ? <div className="space-y-3">{open.map(card)}</div> : <div className="rounded-2xl border border-dashed border-line p-6"><p className="font-medium text-white">No investigations in progress</p><p className="mt-1 text-sm leading-6 muted">Open an investigation from a finding when it needs a closer look or follow-up notes.</p><Link className="quiet-link mt-4 inline-flex text-sm" href="/findings">Browse findings <span aria-hidden="true" className="ml-1">→</span></Link></div>}
      </section>
      <section className="surface p-5 sm:p-6" aria-labelledby="closed-cases"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 id="closed-cases" className="text-lg font-semibold text-white">Completed</h2><p className="mt-1 text-sm muted">Past cases kept for reference</p></div><span className="grid h-9 min-w-9 place-items-center rounded-xl border border-line px-2 text-sm font-semibold text-slate-300">{closed.length}</span></div>
        {closed.length ? <div className="space-y-3">{closed.map(card)}</div> : <div className="rounded-2xl border border-dashed border-line p-6"><p className="font-medium text-white">Completed cases will show here</p><p className="mt-1 text-sm leading-6 muted">When a team closes an investigation, its notes remain available here.</p></div>}
      </section>
    </div>
  </div>;
}
