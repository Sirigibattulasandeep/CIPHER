import Link from 'next/link';
import { listFindings } from '@/lib/findings-store';

const severityClass: Record<string, string> = { CRITICAL: 'score-critical', HIGH: 'score-high', MODERATE: 'score-moderate', LOW: 'score-low' };
const sourceLabel: Record<string, string> = { SOCIAL: 'Social', MOBILE_APP: 'App listing', DOMAIN: 'Domain', WEBSITE: 'Website' };

function sourceHref(source: string, brandId: string) {
  const page = source === 'DOMAIN' || source === 'WEBSITE' ? '/domains' : '/monitoring';
  return `${page}?brandId=${encodeURIComponent(brandId)}`;
}

export default async function FindingsPage() {
  const findings = await listFindings();
  const active = findings.filter(item => item.status !== 'RESOLVED' && item.status !== 'FALSE_POSITIVE').length;

  return <div className="page-shell">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Review queue</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Findings</h1><p className="mt-2 max-w-2xl text-sm leading-6 muted">Potential concerns saved from the records your team analyzed. Each finding is a lead for a person to review.</p></div><Link className="btn btn-secondary" href="/monitoring">Analyze records <span aria-hidden="true">→</span></Link></header>
    <div className="mb-4 flex flex-wrap gap-3"><div className="surface flex items-center gap-3 px-4 py-3"><span className="text-2xl font-semibold tabular-nums text-white">{findings.length}</span><span className="text-xs muted">total saved</span></div><div className="surface flex items-center gap-3 px-4 py-3"><span className="text-2xl font-semibold tabular-nums text-white">{active}</span><span className="text-xs muted">still open</span></div></div>
    <div className="surface overflow-hidden">
      {findings.length ? <>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line bg-white/[.02] text-[10px] uppercase tracking-[.15em] text-slate-500"><tr><th scope="col" className="px-5 py-4">Finding</th><th scope="col" className="px-4 py-4">Source</th><th scope="col" className="px-4 py-4">Severity</th><th scope="col" className="px-4 py-4">Confidence</th><th scope="col" className="px-4 py-4">Status</th><th scope="col" className="px-4 py-4"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-line">{findings.map(finding => <tr key={finding.id} className="transition hover:bg-white/[.02]"><td className="max-w-[360px] px-5 py-4"><div className="truncate font-medium text-white">{finding.title}</div><div className="mt-1 truncate text-xs muted">{finding.affectedEntity} <span aria-hidden="true">·</span> {finding.brandId}</div></td><td className="px-4 py-4 text-slate-300">{sourceLabel[finding.source] ?? finding.source}</td><td className="px-4 py-4"><span className={`score-pill ${severityClass[finding.severity] ?? ''}`} aria-label={`${finding.severity.toLowerCase()} severity, risk score ${finding.riskScore} out of 100`}>{finding.riskScore}</span><span className="ml-2 text-xs text-slate-300">{finding.severity.toLowerCase()}</span></td><td className="px-4 py-4 tabular-nums text-slate-300">{finding.confidence}%</td><td className="px-4 py-4 text-slate-300">{finding.status.replaceAll('_', ' ').toLowerCase()}</td><td className="px-4 py-4"><Link className="quiet-link whitespace-nowrap text-xs" href={sourceHref(finding.source, finding.brandId) as never}>Review source <span aria-hidden="true">→</span></Link></td></tr>)}</tbody></table></div>
        <ul className="divide-y divide-line md:hidden">{findings.map(finding => <li key={finding.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-white">{finding.title}</p><p className="mt-1 truncate text-xs muted">{finding.affectedEntity}</p></div><span className={`score-pill ${severityClass[finding.severity] ?? ''}`} aria-label={`Risk score ${finding.riskScore} out of 100`}>{finding.riskScore}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400"><span>{sourceLabel[finding.source] ?? finding.source}</span><span aria-hidden="true">·</span><span>{finding.severity.toLowerCase()}</span><span aria-hidden="true">·</span><span>{finding.status.replaceAll('_', ' ').toLowerCase()}</span></div><Link className="quiet-link mt-3 inline-flex text-xs" href={sourceHref(finding.source, finding.brandId) as never}>Review source <span aria-hidden="true" className="ml-1">→</span></Link></li>)}</ul>
      </> : <div className="px-5 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-[#0b1727] text-xl text-cyan" aria-hidden="true">✓</div><h2 className="mt-4 font-semibold text-white">You’re all clear for now</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 muted">When you analyze imported or sample records, any potential concerns will appear here for review.</p><Link className="btn btn-primary mt-5" href="/monitoring">Analyze records</Link></div>}
    </div>
    {findings.some(item => item.evidence.some(value => value === 'Record origin: DEMO')) && <p className="mt-4 text-xs leading-5 muted">Some findings are labeled demo examples. Review the evidence and source before taking action.</p>}
  </div>;
}
