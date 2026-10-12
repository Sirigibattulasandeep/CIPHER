import Link from 'next/link';
import { listFindings } from '@/lib/findings-store';
import { listBrands } from '@/lib/store';
import { listInvestigations } from '@/lib/investigations-store';
import { aggregateExposure, severityCounts, severityOrder } from '@/lib/dashboard-metrics';

const severityColor = { CRITICAL: '#fb7185', HIGH: '#fb923c', MODERATE: '#facc15', LOW: '#2dd4bf' } as const;
const severityText = { CRITICAL: 'Critical', HIGH: 'High', MODERATE: 'Medium', LOW: 'Low' } as const;

function point(angle: number, radius: number) {
  return { x: 110 + Math.cos(angle) * radius, y: 105 - Math.sin(angle) * radius };
}

function Arc({ start, end, color, width = 13 }: { start: number; end: number; color: string; width?: number }) {
  const first = point(Math.PI - start * Math.PI, 84);
  const last = point(Math.PI - end * Math.PI, 84);
  const large = end - start > 0.5 ? 1 : 0;
  return <path d={`M ${first.x} ${first.y} A 84 84 0 ${large} 1 ${last.x} ${last.y}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />;
}

function ExposureGauge({ value }: { value: number }) {
  const angle = Math.PI - value / 100 * Math.PI;
  const end = point(angle, 58);
  const severity = value >= 85 ? 'CRITICAL' : value >= 65 ? 'HIGH' : value >= 35 ? 'MODERATE' : 'LOW';
  return <div className="surface p-5"><div className="eyebrow">Aggregate brand exposure</div><svg className="mx-auto mt-3 block w-full max-w-[300px]" viewBox="0 0 220 130" role="img" aria-label={`Exposure index ${value} out of 100, ${severityText[severity]} priority`}>
    <Arc start={0.02} end={0.34} color={severityColor.LOW} /><Arc start={0.36} end={0.64} color={severityColor.MODERATE} /><Arc start={0.66} end={0.84} color={severityColor.HIGH} /><Arc start={0.86} end={0.98} color={severityColor.CRITICAL} />
    <line x1="110" y1="105" x2={end.x} y2={end.y} stroke="#e5f3ff" strokeWidth="3" strokeLinecap="round" /><circle cx="110" cy="105" r="6" fill="#e5f3ff" />
    <text x="110" y="82" textAnchor="middle" fill="#f8fafc" fontSize="23" fontWeight="700">{value}</text>
    <text x="110" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">out of 100</text>
  </svg><div className="text-center"><span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ color: severityColor[severity], borderColor: `${severityColor[severity]}66` }}>{severityText[severity]} priority</span><p className="mt-3 text-xs muted">Heuristic: highest active finding score + 5 per additional source family, capped at 15 points. It is a prioritization index, not a probability.</p></div></div>;
}

function SeverityGauge({ counts }: { counts: Record<(typeof severityOrder)[number], number> }) {
  const total = severityOrder.reduce((sum, severity) => sum + counts[severity], 0);
  let cursor = 0;
  const arcs = severityOrder.map(severity => {
    const start = cursor;
    const portion = total ? counts[severity] / total : 0;
    cursor += portion;
    return { severity, start, end: cursor, portion };
  }).filter(item => item.portion > 0);
  return <div className="surface p-5"><div className="eyebrow">Finding severity distribution</div><svg className="mx-auto mt-3 block w-full max-w-[300px]" viewBox="0 0 220 130" role="img" aria-label={total ? severityOrder.map(severity => `${severityText[severity]} ${counts[severity]}`).join(', ') : 'No findings to display'}>
    {!total ? <Arc start={0.02} end={0.98} color="#334155" /> : arcs.map(item => <Arc key={item.severity} start={item.start + 0.004} end={item.end - 0.004} color={severityColor[item.severity]} width={18} />)}
    <text x="110" y="80" textAnchor="middle" fill="#f8fafc" fontSize="22" fontWeight="700">{total}</text><text x="110" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">total findings</text>
  </svg><ul className="mt-2 grid grid-cols-2 gap-2 text-sm">{severityOrder.map(severity => <li key={severity} className="flex items-center justify-between rounded-md border border-line px-3 py-2"><span style={{ color: severityColor[severity] }}>{severityText[severity]}</span><span>{counts[severity]}</span></li>)}</ul></div>;
}

export default async function Home() {
  const [brands, findings, investigations] = await Promise.all([listBrands(), listFindings(), listInvestigations()]);
  const activeFindings = findings.filter(finding => !['RESOLVED', 'FALSE_POSITIVE'].includes(finding.status));
  const criticalHigh = activeFindings.filter(finding => finding.severity === 'CRITICAL' || finding.severity === 'HIGH');
  const counts = severityCounts(findings);
  const sourceCounts = { SOCIAL: findings.filter(item => item.source === 'SOCIAL').length,
    MOBILE_APP: findings.filter(item => item.source === 'MOBILE_APP').length,
    DOMAIN: findings.filter(item => item.source === 'DOMAIN' || item.source === 'WEBSITE').length };
  const simulated = findings.filter(item => item.evidence.some(value => value === 'Record origin: DEMO')).length;
  const openInvestigations = investigations.filter(item => item.status !== 'CLOSED').length;
  const activeBrands = brands.filter(brand => brand.monitoringConfiguration.enabled).length;
  return <div className="p-6 md:p-10">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">Threat overview</div><h1 className="mt-2 text-3xl font-bold">SENTRIX operations</h1><p className="mt-2 muted">Exposure and review activity from saved imported and simulated records.</p></div><div className="flex flex-wrap gap-3"><Link href="/monitoring" className="btn btn-secondary">Social &amp; apps</Link><Link href="/domains" className="btn btn-secondary">Website &amp; domain analysis</Link><Link href="/brands/new" className="btn btn-primary">Add brand</Link></div></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="surface p-5"><div className="eyebrow">Brand profiles</div><div className="mt-3 text-3xl font-bold">{brands.length}</div><p className="mt-1 text-xs muted">{activeBrands} configured for monitoring</p></div><div className="surface p-5"><div className="eyebrow">Open findings</div><div className="mt-3 text-3xl font-bold">{activeFindings.length}</div><p className="mt-1 text-xs muted">From the selected organization’s saved records</p></div><div className="surface p-5"><div className="eyebrow">Critical or high</div><div className="mt-3 text-3xl font-bold">{criticalHigh.length}</div><p className="mt-1 text-xs muted">Open findings requiring priority review</p></div><div className="surface p-5"><div className="eyebrow">Open investigations</div><div className="mt-3 text-3xl font-bold">{openInvestigations}</div><p className="mt-1 text-xs muted">With persistent analyst notes</p></div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><ExposureGauge value={aggregateExposure(activeFindings)} /><SeverityGauge counts={counts} /></div>
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="surface p-5"><div className="eyebrow">Social records</div><div className="mt-2 text-2xl font-bold">{sourceCounts.SOCIAL}</div></div><div className="surface p-5"><div className="eyebrow">App listings</div><div className="mt-2 text-2xl font-bold">{sourceCounts.MOBILE_APP}</div></div><div className="surface p-5"><div className="eyebrow">Domains &amp; websites</div><div className="mt-2 text-2xl font-bold">{sourceCounts.DOMAIN}</div></div><div className="surface p-5"><div className="eyebrow">Simulated findings</div><div className="mt-2 text-2xl font-bold">{simulated}</div><p className="mt-1 text-xs muted">Explicit demo records in saved findings</p></div></section>
    <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><strong>Source status:</strong> No live external connectors are configured. Social and app scans analyze imported or simulated records; domain analysis only parses submitted URLs and metadata locally.</div>
    <section className="mt-7 surface p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Brand portfolio</h2><Link className="text-sm text-cyan" href="/brands">Manage all brands →</Link></div><div className="mt-4 divide-y divide-line">{brands.map(brand => <Link className="flex flex-wrap items-center justify-between gap-2 py-4 hover:text-cyan" key={brand.id} href={`/brands/${brand.id}`}><span><span className="font-semibold">{brand.name}</span><span className="ml-3 text-sm muted">{brand.industry.replaceAll('_', ' ')}</span></span><span className="text-xs muted">{brand.monitoringConfiguration.enabled ? 'Monitoring enabled' : 'Monitoring paused'} · View profile →</span></Link>)}</div>{brands.length === 0 && <p className="mt-4 text-sm muted">Create a brand profile to configure official assets.</p>}</section>
    <section className="mt-7 surface p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Recent findings</h2><Link className="text-sm text-cyan" href="/findings">Open findings →</Link></div><div className="mt-4 divide-y divide-line">{findings.slice(0, 8).map(finding => <Link href={finding.source === 'DOMAIN' || finding.source === 'WEBSITE' ? '/domains' : '/monitoring'} key={finding.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-cyan"><span>{finding.title}<span className="ml-2 text-xs muted">{finding.evidence.find(value => value.startsWith('Record origin:'))?.replace('Record origin: ', '')}</span></span><span className="text-xs muted">{finding.severity} · {finding.riskScore}/100</span></Link>)}</div>{findings.length === 0 && <p className="mt-4 text-sm muted">No findings are saved. Add a brand and run an imported or simulated scan.</p>}</section>
  </div>;
}
