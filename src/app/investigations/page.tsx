import Link from 'next/link';
import { listFindings } from '@/lib/findings-store';
import { listInvestigations } from '@/lib/investigations-store';

export default async function InvestigationsPage() {
  const [investigations, findings] = await Promise.all([listInvestigations(), listFindings()]);
  const findingById = new Map(findings.map(finding => [finding.id, finding]));
  const active = investigations.filter(item => item.status !== 'CLOSED');
  const closed = investigations.filter(item => item.status === 'CLOSED');
  return <div className="p-6 md:p-10"><div className="eyebrow">Response workspace</div><h1 className="mt-2 text-3xl font-bold">Investigations</h1><p className="mt-2 muted">Open a record from a finding to add durable analyst notes and review its evidence.</p>
    <section className="surface mt-7 p-5"><h2 className="font-semibold">Open <span className="ml-2 text-sm font-normal muted">{active.length}</span></h2>{active.length ? <div className="mt-3 divide-y divide-line">{active.map(item => { const finding = findingById.get(item.findingId); return finding ? <Link key={item.id} href={`/monitoring?brandId=${encodeURIComponent(item.brandId)}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-cyan"><span><span className="font-medium">{finding.title}</span><span className="ml-2 text-xs muted">{finding.affectedEntity}</span><span className="ml-2 text-xs muted">{item.notes.length} notes</span></span><span className="text-xs muted">{finding.severity} · {item.status.replace('_', ' ')} · Open in monitoring →</span></Link> : null; })}</div> : <p className="mt-3 text-sm muted">No investigations have been opened. Open one from a finding’s detail drawer.</p>}</section>
    <section className="surface mt-5 p-5"><h2 className="font-semibold">Closed <span className="ml-2 text-sm font-normal muted">{closed.length}</span></h2>{closed.length ? <div className="mt-3 divide-y divide-line">{closed.map(item => { const finding = findingById.get(item.findingId); return finding ? <Link key={item.id} href={`/monitoring?brandId=${encodeURIComponent(item.brandId)}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-cyan"><span>{finding.title}<span className="ml-2 text-xs muted">{finding.affectedEntity}</span></span><span className="text-xs muted">{item.notes.length} notes</span></Link> : null; })}</div> : <p className="mt-3 text-sm muted">No closed investigations.</p>}</section>
  </div>;
}
