import Link from 'next/link';
import { listFindings } from '@/lib/findings-store';

export default async function InvestigationsPage() {
  const findings = await listFindings();
  const active = findings.filter(finding => finding.status === 'INVESTIGATING');
  const closed = findings.filter(finding => finding.status === 'RESOLVED' || finding.status === 'FALSE_POSITIVE');
  return <div className="p-6 md:p-10"><div className="eyebrow">Response workspace</div><h1 className="mt-2 text-3xl font-bold">Investigations</h1><p className="mt-2 muted">Investigation status is shared with the findings queue.</p>
    <section className="surface mt-7 p-5"><h2 className="font-semibold">In progress <span className="ml-2 text-sm font-normal muted">{active.length}</span></h2>{active.length ? <div className="mt-3 divide-y divide-line">{active.map(finding => <Link key={finding.id} href={`/monitoring?brandId=${encodeURIComponent(finding.brandId)}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-cyan"><span><span className="font-medium">{finding.title}</span><span className="ml-2 text-xs muted">{finding.affectedEntity}</span></span><span className="text-xs muted">{finding.severity} · {finding.confidence}% confidence · Review →</span></Link>)}</div> : <p className="mt-3 text-sm muted">No findings are marked Investigating. Open a finding to assign this status.</p>}</section>
    <section className="surface mt-5 p-5"><h2 className="font-semibold">Resolved or dismissed <span className="ml-2 text-sm font-normal muted">{closed.length}</span></h2>{closed.length ? <div className="mt-3 divide-y divide-line">{closed.map(finding => <Link key={finding.id} href={`/monitoring?brandId=${encodeURIComponent(finding.brandId)}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-cyan"><span><span className="font-medium">{finding.title}</span><span className="ml-2 text-xs muted">{finding.affectedEntity}</span></span><span className="text-xs muted">{finding.status.replace('_', ' ')} · Reopen →</span></Link>)}</div> : <p className="mt-3 text-sm muted">No findings are resolved or dismissed yet.</p>}</section>
  </div>;
}
