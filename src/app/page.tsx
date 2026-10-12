import Link from 'next/link';
import type { Finding, Severity } from '@/lib/contracts';
import { listFindings } from '@/lib/findings-store';
import { listBrands } from '@/lib/store';
import { listInvestigations } from '@/lib/investigations-store';
import { aggregateExposure, severityOrder } from '@/lib/dashboard-metrics';

export const dynamic = 'force-dynamic';

const severityNames: Record<Severity, string> = { CRITICAL: 'Critical', HIGH: 'High', MODERATE: 'Moderate', LOW: 'Low' };
const severityColors: Record<Severity, string> = { CRITICAL: '#fb7185', HIGH: '#fb923c', MODERATE: '#facc15', LOW: '#2dd4bf' };
const sourceNames: Record<Finding['source'], string> = { SOCIAL: 'Social', MOBILE_APP: 'Apps', DOMAIN: 'Domains', WEBSITE: 'Websites' };

function MetricCard({ label, value, detail, tone = 'cyan' }: { label: string; value: number; detail: string; tone?: 'cyan' | 'rose' | 'amber' | 'violet' }) {
  return <article className={`metric-card metric-${tone}`}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-300">{label}</p><span className="metric-mark" aria-hidden="true" /></div>
    <p className="mt-5 text-4xl font-semibold tracking-tight text-white">{value}</p>
    <p className="mt-2 text-sm muted">{detail}</p>
  </article>;
}

function SeverityBreakdown({ findings }: { findings: Finding[] }) {
  const counts = severityOrder.reduce((result, severity) => {
    result[severity] = findings.filter(item => item.severity === severity).length;
    return result;
  }, {} as Record<Severity, number>);
  const max = Math.max(1, ...Object.values(counts));

  return <section className="surface p-5 sm:p-6" aria-labelledby="severity-heading">
    <div className="flex items-start justify-between gap-4">
      <div><p className="eyebrow">At a glance</p><h2 id="severity-heading" className="mt-2 text-lg font-semibold text-white">Findings by severity</h2><p className="mt-1 text-sm muted">A quick way to see what may need attention first.</p></div>
      <Link className="quiet-link shrink-0 text-sm" href="/findings">View all <span aria-hidden="true">→</span></Link>
    </div>
    {findings.length ? <div className="mt-7 space-y-5" role="list" aria-label="Findings by severity">
      {severityOrder.map(severity => <div key={severity} role="listitem">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2.5 font-medium text-slate-200"><span className="severity-dot" style={{ backgroundColor: severityColors[severity] }} />{severityNames[severity]}</span><span className="tabular-nums text-slate-300">{counts[severity]} <span className="muted">{counts[severity] === 1 ? 'finding' : 'findings'}</span></span></div>
        <div className="chart-track" role="progressbar" aria-label={`${severityNames[severity]} findings`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={counts[severity]}><div className="chart-fill" style={{ width: `${counts[severity] / max * 100}%`, backgroundColor: severityColors[severity] }} /></div>
      </div>)}
    </div> : <div className="empty-chart mt-6"><span className="empty-chart-icon" aria-hidden="true">✓</span><div><p className="font-medium text-white">Nothing needs review yet</p><p className="mt-1 text-sm muted">Findings will appear here after you analyze records.</p></div></div>}
    <p className="mt-6 border-t border-line pt-4 text-xs muted">Severity describes the potential impact in the saved record. It is a review guide, not a prediction.</p>
  </section>;
}

function SourceBreakdown({ findings }: { findings: Finding[] }) {
  const sourceOrder: Finding['source'][] = ['SOCIAL', 'MOBILE_APP', 'DOMAIN', 'WEBSITE'];
  const counts = sourceOrder.map(source => ({ source, count: findings.filter(item => item.source === source).length }));
  const total = findings.length;
  let cursor = 0;
  const colors: Record<Finding['source'], string> = { SOCIAL: '#5eead4', MOBILE_APP: '#60a5fa', DOMAIN: '#a78bfa', WEBSITE: '#fbbf24' };
  const segments = counts.map(item => {
    const start = cursor;
    cursor += total ? item.count / total * 100 : 0;
    return `${colors[item.source]} ${start}% ${cursor}%`;
  });
  const chart = total ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#334155 0% 100%)';

  return <section className="surface p-5 sm:p-6" aria-labelledby="sources-heading">
    <p className="eyebrow">Coverage</p><h2 id="sources-heading" className="mt-2 text-lg font-semibold text-white">Where records came from</h2><p className="mt-1 text-sm muted">Saved findings, grouped by source.</p>
    <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="source-donut" style={{ background: chart }} role="img" aria-label={total ? counts.filter(item => item.count).map(item => `${sourceNames[item.source]} ${item.count}`).join(', ') : 'No saved findings'}><div className="source-donut-center"><span className="text-3xl font-semibold text-white">{total}</span><span className="mt-1 text-[10px] uppercase tracking-[.15em] muted">records</span></div></div>
      <ul className="w-full space-y-3 sm:max-w-[210px]">{counts.map(item => <li key={item.source} className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2.5 text-slate-300"><span className="severity-dot" style={{ backgroundColor: colors[item.source] }} />{sourceNames[item.source]}</span><span className="tabular-nums font-medium text-white">{item.count}</span></li>)}</ul>
    </div>
    {!total && <p className="mt-5 text-center text-xs muted">Run an analysis to see your source mix.</p>}
  </section>;
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Moderate';
  return 'Low';
}

export default async function Home() {
  const [brands, findings, investigations] = await Promise.all([listBrands(), listFindings(), listInvestigations()]);
  const activeFindings = findings.filter(item => !['RESOLVED', 'FALSE_POSITIVE'].includes(item.status));
  const priorityFindings = activeFindings.filter(item => item.severity === 'CRITICAL' || item.severity === 'HIGH');
  const openInvestigations = investigations.filter(item => item.status !== 'CLOSED').length;
  const monitoredBrands = brands.filter(brand => brand.monitoringConfiguration.enabled).length;
  const demoFindings = findings.filter(item => item.evidence.some(value => value === 'Record origin: DEMO')).length;
  const exposure = aggregateExposure(activeFindings);
  const brandsById = new Map(brands.map(brand => [brand.id, brand.name]));
  const latestFindings = [...findings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return <div className="page-shell">
    <header className="dashboard-hero">
      <div className="relative z-10 max-w-3xl">
        <p className="eyebrow">Your workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">A clearer view of brand risk</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">See what has been flagged, decide what needs a closer look, and keep your brand records in one place.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/findings" className="btn btn-primary">Review findings <span aria-hidden="true">→</span></Link><Link href="/brands/new" className="btn btn-secondary">Add a brand</Link></div>
      </div>
      <div className="hero-status"><span className="status-pulse" aria-hidden="true" /><span>{activeFindings.length ? `${activeFindings.length} open ${activeFindings.length === 1 ? 'item' : 'items'} to review` : 'No open items to review'}</span></div>
    </header>

    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace summary">
      <MetricCard label="Open findings" value={activeFindings.length} detail="Items not yet resolved" tone="cyan" />
      <MetricCard label="Priority reviews" value={priorityFindings.length} detail="Critical or high severity" tone="rose" />
      <MetricCard label="Open investigations" value={openInvestigations} detail="Cases still being worked" tone="amber" />
      <MetricCard label="Monitored brands" value={monitoredBrands} detail={`${brands.length} ${brands.length === 1 ? 'brand profile' : 'brand profiles'} in your workspace`} tone="violet" />
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]" aria-label="Finding visualizations">
      <SeverityBreakdown findings={activeFindings} />
      <SourceBreakdown findings={findings} />
    </section>

    <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5 sm:p-6"><div><p className="eyebrow">The latest</p><h2 className="mt-2 text-lg font-semibold text-white">Recent findings</h2><p className="mt-1 text-sm muted">The newest records saved to this workspace.</p></div><Link className="quiet-link text-sm" href="/findings">All findings <span aria-hidden="true">→</span></Link></div>
        {latestFindings.length ? <ul className="divide-y divide-line">{latestFindings.map(finding => <li key={finding.id}><Link href={finding.source === 'DOMAIN' || finding.source === 'WEBSITE' ? '/domains' : '/monitoring'} className="finding-row"><span className="min-w-0"><span className="block truncate font-medium text-white">{finding.title}</span><span className="mt-1 block truncate text-xs muted">{brandsById.get(finding.brandId) ?? 'Unknown brand'} <span aria-hidden="true">·</span> {sourceNames[finding.source]} <span aria-hidden="true">·</span> {finding.affectedEntity}</span></span><span className={`score-pill score-${finding.severity.toLowerCase()}`} aria-label={`${scoreLabel(finding.riskScore)} severity, score ${finding.riskScore}`}>{finding.riskScore}</span></Link></li>)}</ul> : <div className="p-8"><p className="font-medium text-white">Your findings will show up here</p><p className="mt-1 text-sm muted">Start with a brand profile, then analyze records you want to review.</p><Link className="quiet-link mt-4 inline-flex text-sm" href="/brands/new">Create a brand profile <span aria-hidden="true">→</span></Link></div>}
      </div>

      <div className="space-y-5">
        <section className="surface p-5 sm:p-6" aria-labelledby="exposure-heading"><p className="eyebrow">A prioritization aid</p><h2 id="exposure-heading" className="mt-2 text-lg font-semibold text-white">Exposure index</h2><div className="mt-5 flex items-end gap-3"><span className="text-5xl font-semibold tracking-tight text-white">{exposure}</span><span className="pb-1 text-sm muted">out of 100</span><span className="ml-auto rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-300">{scoreLabel(exposure)} priority</span></div><div className="mt-4 chart-track chart-track-tall" role="progressbar" aria-label="Exposure index" aria-valuemin={0} aria-valuemax={100} aria-valuenow={exposure}><div className="chart-fill bg-gradient-to-r from-teal-300 via-amber-300 to-rose-400" style={{ width: `${exposure}%` }} /></div><p className="mt-4 text-xs leading-5 muted">A simple review score based on the strongest open finding and how many source types also raised a concern. It is not a probability.</p></section>
        <section className="source-note"><span className="source-note-icon" aria-hidden="true">i</span><p><strong className="font-semibold text-slate-200">About these records</strong><br />{demoFindings ? `${demoFindings} of ${findings.length} saved findings are labeled as demo data. ` : ''}No live monitoring connectors are configured. Scans use records you import or clearly labeled examples; website analysis checks only the details you submit.</p></section>
      </div>
    </section>

    <section className="mt-6 surface p-5 sm:p-6" aria-labelledby="brands-heading">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Your portfolio</p><h2 id="brands-heading" className="mt-2 text-lg font-semibold text-white">Brand profiles</h2><p className="mt-1 text-sm muted">Official details help you review suspicious lookalikes.</p></div><Link className="quiet-link text-sm" href="/brands">Manage brands <span aria-hidden="true">→</span></Link></div>
      {brands.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{brands.slice(0, 6).map(brand => <Link key={brand.id} href={`/brands/${brand.id}`} className="brand-card"><span className="brand-avatar" aria-hidden="true">{brand.name.trim().charAt(0).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium text-white">{brand.name}</span><span className="mt-1 block truncate text-xs muted">{brand.domains[0] || brand.industry.replaceAll('_', ' ')}</span></span><span className={`brand-state ${brand.monitoringConfiguration.enabled ? 'brand-state-on' : ''}`}>{brand.monitoringConfiguration.enabled ? 'On' : 'Paused'}</span></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-line p-6 text-center"><p className="font-medium text-white">Add your first brand profile</p><p className="mt-1 text-sm muted">Keep verified domains, social accounts, and apps together.</p><Link className="btn btn-primary mt-4 inline-block" href="/brands/new">Create profile</Link></div>}
    </section>
  </div>;
}
