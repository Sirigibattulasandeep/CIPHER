'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Brand, Finding } from '@/lib/contracts';
import type { Investigation } from '@/lib/investigations-store';

type Kind = 'social' | 'apps';
type SourceFilter = 'ALL' | Finding['source'];
type SeverityFilter = 'ALL' | Finding['severity'];
type OriginFilter = 'ALL' | 'IMPORTED' | 'DEMO' | 'CONNECTED';

function originOf(finding: Finding): 'DEMO' | 'IMPORTED' | 'CONNECTED' {
  const origin = finding.detectionIndicators.find(value => value.startsWith('Record origin: '))?.slice('Record origin: '.length);
  return origin === 'DEMO' || origin === 'CONNECTED' ? origin : 'IMPORTED';
}

function severityClass(severity: Finding['severity']): string {
  if (severity === 'CRITICAL') return 'border-rose-400/30 bg-rose-400/10 text-rose-200';
  if (severity === 'HIGH') return 'border-orange-400/30 bg-orange-400/10 text-orange-200';
  if (severity === 'MODERATE') return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
  return 'border-slate-400/25 bg-slate-400/10 text-slate-300';
}

function originLabel(origin: ReturnType<typeof originOf>): string {
  return origin === 'DEMO' ? 'Simulated' : origin === 'CONNECTED' ? 'Connected source' : 'Imported';
}

function platformOf(finding: Finding): string {
  return finding.source === 'SOCIAL'
    ? finding.affectedEntity.split(' ')[0] ?? 'Unknown'
    : finding.affectedEntity.split(' · ')[0] ?? 'Unknown';
}

function demoRecords(kind: Kind, brand: Brand): object[] {
  if (kind === 'social') return [
    {
      id: 'demo-social-support', platform: 'LinkedIn', handle: '@acme-learning-support',
      displayName: `${brand.name} Official Support`,
      bio: `Official ${brand.name} support. Claim your prize by paying a processing fee.`,
      profileUrl: 'https://www.linkedin.com/company/demo-acme-support',
      links: ['https://acme-learnlng.example/login'],
      posts: [{ id: 'demo-post-1', text: 'Claim your prize by paying a processing fee.', url: 'https://social.example/demo-post-1' }],
      avatarSimilarity: 0.91, sourceReliability: 0.6, origin: 'DEMO',
    },
    {
      id: 'demo-social-fan', platform: 'LinkedIn', handle: '@acme-learning-community',
      displayName: `${brand.name} Learner Community`, bio: 'An unofficial community for learners.',
      profileUrl: 'https://www.linkedin.com/company/demo-acme-community', sourceReliability: 0.6, origin: 'DEMO',
    },
  ];
  return [
    {
      id: 'demo-app-support', store: 'Google Play (demo record)', appId: 'com.example.acme.support',
      name: `${brand.name} Support`, publisher: 'Example Studio',
      description: `Official ${brand.name} support. Claim your prize by paying a processing fee.`,
      storeUrl: 'https://play.google.com/store/apps/details?id=com.example.acme.support',
      links: ['https://acme-learnlng.example/login'], logoSimilarity: 0.92,
      sourceReliability: 0.6, origin: 'DEMO',
    },
    {
      id: 'demo-app-unrelated', store: 'Google Play (demo record)', appId: 'com.example.stargazer',
      name: 'Stargazer Sky Guide', publisher: 'Open Sky Apps', description: 'Explore constellations and learn astronomy.',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.example.stargazer',
      sourceReliability: 0.6, origin: 'DEMO',
    },
  ];
}

export function MonitoringWorkspace({ brands, initialBrandId }: { brands: Brand[]; initialBrandId?: string }) {
  const [brandId, setBrandId] = useState(brands.some(item => item.id === initialBrandId) ? initialBrandId ?? '' : brands[0]?.id ?? '');
  const [kind, setKind] = useState<Kind>('social');
  const [recordText, setRecordText] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingInvestigation, setSavingInvestigation] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const brand = brands.find(item => item.id === brandId);
  const refreshFindings = useCallback(async () => {
    if (!brandId) { setFindings([]); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/findings?brandId=${encodeURIComponent(brandId)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load findings.');
      setFindings(await response.json() as Finding[]);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load findings.');
    } finally { setLoading(false); }
  }, [brandId]);

  useEffect(() => { void refreshFindings(); }, [refreshFindings]);
  useEffect(() => {
    if (!selected) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selected]);
  useEffect(() => {
    let active = true;
    setInvestigation(null);
    if (!selected) return () => { active = false; };
    void fetch(`/api/investigations?findingId=${encodeURIComponent(selected.id)}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() as Promise<Investigation[]> : [])
      .then(values => { if (active) setInvestigation(values[0] ?? null); })
      .catch(() => { if (active) setInvestigation(null); });
    return () => { active = false; };
  }, [selected?.id]);

  const filtered = useMemo(() => findings.filter(finding =>
    (sourceFilter === 'ALL' || finding.source === sourceFilter) &&
    (originFilter === 'ALL' || originOf(finding) === originFilter) &&
    (platformFilter === 'ALL' || platformOf(finding) === platformFilter) &&
    (severityFilter === 'ALL' || finding.severity === severityFilter) &&
    (!query.trim() || [finding.title, finding.description, finding.affectedEntity, ...finding.evidence]
      .some(value => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())))
  ), [findings, originFilter, platformFilter, query, severityFilter, sourceFilter]);
  const platforms = [...new Set(findings.map(platformOf))].sort();

  async function scan() {
    setError(''); setSuccess('');
    if (!brandId) { setError('Create or select a brand profile before scanning.'); return; }
    let parsed: unknown;
    try {
      parsed = JSON.parse(recordText);
      if (!Array.isArray(parsed)) parsed = (parsed as { profiles?: unknown[]; apps?: unknown[] })[kind === 'social' ? 'profiles' : 'apps'];
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Provide a non-empty JSON array of candidate records.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The record file is not valid JSON.'); return;
    }
    setScanning(true);
    try {
      const response = await fetch('/api/monitoring/scan', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ brandId, kind, records: parsed }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'The scan could not be completed.');
      setSuccess(result.message);
      await refreshFindings();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The scan could not be completed.');
    } finally { setScanning(false); }
  }

  async function updateStatus(finding: Finding, status: Finding['status']) {
    setSavingStatus(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`/api/findings/${encodeURIComponent(finding.id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Could not update investigation status.');
      setFindings(current => current.map(item => item.id === result.id ? result as Finding : item));
      setSelected(result as Finding);
      setSuccess('Investigation status saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update investigation status.');
    } finally { setSavingStatus(false); }
  }

  async function openInvestigation() {
    if (!selected) return;
    setSavingInvestigation(true); setError('');
    try {
      const response = await fetch('/api/investigations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ findingId: selected.id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Could not open an investigation.');
      setInvestigation(result as Investigation); setSuccess('Investigation opened.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open an investigation.'); }
    finally { setSavingInvestigation(false); }
  }

  async function addNote() {
    if (!investigation || !noteText.trim()) return;
    setSavingInvestigation(true); setError('');
    try {
      const response = await fetch(`/api/investigations/${encodeURIComponent(investigation.id)}/notes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: noteText }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Could not save the note.');
      setInvestigation(result as Investigation); setNoteText(''); setSuccess('Analyst note saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the note.'); }
    finally { setSavingInvestigation(false); }
  }

  async function updateInvestigationStatus(status: Investigation['status']) {
    if (!investigation) return;
    setSavingInvestigation(true); setError('');
    try {
      const response = await fetch(`/api/investigations/${encodeURIComponent(investigation.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Could not update the investigation.');
      setInvestigation(result as Investigation); setSuccess('Investigation status saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update the investigation.'); }
    finally { setSavingInvestigation(false); }
  }

  return <div className="p-5 md:p-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><div className="eyebrow">External threat discovery</div><h1 className="mt-2 text-3xl font-bold">Social &amp; App Monitoring</h1><p className="mt-2 max-w-2xl muted">Screen supplied profiles, posts, and store listings against a brand’s trusted assets. Every result is a review lead with traceable evidence.</p></div>
      <Link href="/brands" className="btn btn-secondary">Manage brand profiles</Link>
    </div>

    {!brands.length ? <section className="surface p-8"><h2 className="text-xl font-semibold">Add a brand profile to begin</h2><p className="mt-2 muted">Configure official domains, social accounts, apps, and logo references so the scanner can exclude known assets.</p><Link className="btn btn-primary mt-5 inline-block" href="/brands/new">Create brand profile</Link></section> : <>
      <section className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="eyebrow">Candidate scanner</div><h2 className="mt-2 text-lg font-semibold">Analyze profiles or app listings</h2><p className="mt-1 text-sm muted">No live source is connected. Import JSON or use clearly labeled demo records.</p></div><select aria-label="Brand profile" className="field w-full sm:max-w-xs" value={brandId} onChange={event => { setBrandId(event.target.value); setSelected(null); }}><option value="">Choose a brand</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Record type">
          <button type="button" aria-pressed={kind === 'social'} onClick={() => setKind('social')} className={`btn ${kind === 'social' ? 'btn-primary' : 'btn-secondary'}`}>Social profiles &amp; posts</button>
          <button type="button" aria-pressed={kind === 'apps'} onClick={() => setKind('apps')} className={`btn ${kind === 'apps' ? 'btn-primary' : 'btn-secondary'}`}>App store listings</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-secondary" disabled={!brand} onClick={() => brand && setRecordText(JSON.stringify(demoRecords(kind, brand), null, 2))}>Load demo records</button>
          <label className="btn btn-secondary cursor-pointer">Import JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={async event => { const input = event.currentTarget; const file = input.files?.[0]; if (file) setRecordText(await file.text()); input.value = ''; }} /></label>
          <span className="text-xs muted">Array of records, or an object with a {kind === 'social' ? '`profiles`' : '`apps`'} array.</span>
        </div>
        <label htmlFor="candidate-json" className="mb-2 mt-4 block text-sm font-semibold">Candidate records (JSON)</label>
        <textarea id="candidate-json" rows={9} className="field font-mono text-xs" value={recordText} onChange={event => setRecordText(event.target.value)} placeholder={kind === 'social' ? '[{"platform":"LinkedIn","handle":"@example_support","displayName":"Example Support","bio":"..."}]' : '[{"store":"Google Play","appId":"com.example.app","name":"Example Support","publisher":"Unknown"}]'} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-xs muted">A scan analyzes only records you provide. Demo results are labeled simulated and must not be presented as live threats.</p><button type="button" disabled={scanning || !recordText.trim() || !brandId} onClick={() => void scan()} className="btn btn-primary min-w-36">{scanning ? 'Analyzing…' : `Scan ${kind === 'social' ? 'profiles' : 'apps'}`}</button></div>
      </section>

      {(error || success) && <div className={`mt-4 rounded-lg border p-3 text-sm ${error ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-teal/25 bg-teal/10 text-teal-100'}`} role={error ? 'alert' : 'status'}>{error || success}</div>}

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Review queue</div><h2 className="mt-2 text-xl font-semibold">Findings {brand ? <span className="text-sm font-normal muted">for {brand.name}</span> : null}</h2></div><span className="text-sm muted">{filtered.length} shown · {findings.length} total</span></div>
        <div className="surface mb-4 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_170px_170px_170px_170px]"><div><label htmlFor="finding-search" className="sr-only">Search profiles, apps, evidence</label><input id="finding-search" className="field" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search profile, app, or evidence" /></div><div><label htmlFor="finding-source" className="sr-only">Filter by source</label><select id="finding-source" className="field" value={sourceFilter} onChange={event => setSourceFilter(event.target.value as SourceFilter)}><option value="ALL">All sources</option><option value="SOCIAL">Social</option><option value="MOBILE_APP">Mobile apps</option></select></div><div><label htmlFor="finding-platform" className="sr-only">Filter by platform or store</label><select id="finding-platform" className="field" value={platformFilter} onChange={event => setPlatformFilter(event.target.value)}><option value="ALL">All platforms/stores</option>{platforms.map(platform => <option key={platform} value={platform}>{platform}</option>)}</select></div><div><label htmlFor="finding-origin" className="sr-only">Filter by record origin</label><select id="finding-origin" className="field" value={originFilter} onChange={event => setOriginFilter(event.target.value as OriginFilter)}><option value="ALL">All record origins</option><option value="CONNECTED">Connected</option><option value="IMPORTED">Imported</option><option value="DEMO">Simulated demo</option></select></div><div><label htmlFor="finding-severity" className="sr-only">Filter by severity</label><select id="finding-severity" className="field" value={severityFilter} onChange={event => setSeverityFilter(event.target.value as SeverityFilter)}><option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MODERATE">Moderate</option><option value="LOW">Low</option></select></div></div>
        <div className="surface overflow-hidden">
          {loading ? <div className="space-y-3 p-5" aria-label="Loading findings"><div className="h-12 animate-pulse rounded-lg bg-white/5" /><div className="h-12 animate-pulse rounded-lg bg-white/5" /><div className="h-12 animate-pulse rounded-lg bg-white/5" /></div> : filtered.length === 0 ? <div className="p-10 text-center"><h3 className="font-semibold">No matching findings</h3><p className="mt-2 text-sm muted">Run a scan or adjust the filters. Official app IDs are excluded from impersonation alerts.</p></div> : <>
            <div className="space-y-3 p-3 md:hidden">{filtered.map(finding => <article key={`mobile-${finding.id}`} className="rounded-lg border border-line p-4"><div className="flex items-start justify-between gap-3"><button type="button" className="text-left font-semibold" onClick={() => setSelected(finding)}>{finding.affectedEntity}</button><span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${severityClass(finding.severity)}`}>{finding.severity} · {finding.riskScore}</span></div><p className="mt-2 text-sm muted">{finding.title}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded border border-line px-2 py-1">{finding.source === 'SOCIAL' ? 'Social' : 'App store'}</span><span className="rounded border border-line px-2 py-1">{originLabel(originOf(finding))}</span><span className="rounded border border-line px-2 py-1">{finding.status.replace('_', ' ')}</span></div><div className="mt-3 flex items-center justify-between gap-2 text-xs muted"><span>{new Date(finding.updatedAt).toLocaleDateString()}</span><button type="button" className="text-cyan" onClick={() => setSelected(finding)}>Inspect evidence →</button></div></article>)}</div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wide muted"><tr><th scope="col" className="px-5 py-3">Profile or app</th><th scope="col" className="px-4 py-3">Type</th><th scope="col" className="px-4 py-3">Risk</th><th scope="col" className="px-4 py-3">Origin</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Updated</th><th scope="col" className="px-4 py-3"><span className="sr-only">Open finding</span></th></tr></thead><tbody className="divide-y divide-line">{filtered.map(finding => <tr key={finding.id} className="hover:bg-white/[.025]"><td className="max-w-[340px] px-5 py-4"><button type="button" className="text-left font-semibold hover:text-cyan focus-visible:text-cyan" onClick={() => setSelected(finding)}>{finding.affectedEntity}</button><p className="mt-1 truncate text-xs muted">{finding.title}</p></td><td className="px-4 py-4">{finding.source === 'SOCIAL' ? 'Social' : 'App store'}</td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(finding.severity)}`}>{finding.severity}</span><span className="ml-2 text-xs muted">{finding.riskScore}/100</span></td><td className="px-4 py-4"><span className="rounded-full border border-line px-2.5 py-1 text-xs">{originLabel(originOf(finding))}</span></td><td className="px-4 py-4 text-xs">{finding.status.replace('_', ' ')}</td><td className="px-4 py-4 text-xs muted">{new Date(finding.updatedAt).toLocaleString()}</td><td className="px-4 py-4"><button type="button" aria-label={`Inspect ${finding.affectedEntity}`} className="text-cyan" onClick={() => setSelected(finding)}>Inspect →</button></td></tr>)}</tbody></table></div>
          </>}
        </div>
      </section>

      <section className="mt-8"><div className="eyebrow">Recent monitoring activity</div><div className="surface mt-3 divide-y divide-line">{findings.slice(0, 4).length ? findings.slice(0, 4).map(finding => <div key={`activity-${finding.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"><span>{finding.title}</span><span className="text-xs muted">{originLabel(originOf(finding))} · {new Date(finding.createdAt).toLocaleString()}</span></div>) : <p className="p-5 text-sm muted">No scans recorded for this brand yet.</p>}</div></section>
    </>}

    {selected && <div className="fixed inset-0 z-30 flex justify-end bg-black/60" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null); }}><aside role="dialog" aria-modal="true" aria-labelledby="finding-title" className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-[#0b1727] p-5 shadow-2xl md:p-7">
      <div className="flex items-start justify-between gap-4"><div><div className="eyebrow">Finding detail · {originLabel(originOf(selected))}</div><h2 id="finding-title" className="mt-2 text-xl font-bold">{selected.title}</h2></div><button type="button" autoFocus className="btn btn-secondary" aria-label="Close finding detail" onClick={() => setSelected(null)}>Close</button></div>
      <div className="mt-5 flex flex-wrap items-center gap-3"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClass(selected.severity)}`}>{selected.severity} · {selected.riskScore}/100</span><span className="text-xs muted">Confidence {selected.confidence}%</span></div>
      {selected.riskScoreBreakdown?.length ? <div className="mt-5"><h3 className="font-semibold">Risk score breakdown <span className="ml-1 text-xs font-normal muted">{selected.scoringVersion}</span></h3><ul className="mt-3 space-y-2">{selected.riskScoreBreakdown.map((part, index) => <li key={`${part.category}-${part.indicator}-${index}`} className="flex items-start justify-between gap-4 rounded-lg border border-line p-3 text-sm"><span><span className="font-medium">{part.reason}</span><span className="mt-1 block text-xs muted">{part.category.replaceAll('_', ' ')} · {part.indicator.replaceAll('_', ' ')}</span></span><span className="shrink-0 text-cyan">+{part.contribution}</span></li>)}</ul></div> : null}
      <div className="surface mt-5 p-4"><div className="text-sm font-semibold">Why it matters</div><p className="mt-2 text-sm muted">{selected.description}</p><p className="mt-3 text-xs muted">Brand: {selected.brandId} · Category: {selected.category} · Status: {selected.status.replace('_', ' ')}</p>{selected.sourceUrl && <a className="mt-3 inline-block break-all text-sm text-cyan underline" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open untrusted source record ↗</a>}</div>
      <div className="mt-6"><h3 className="font-semibold">Detection indicators</h3><div className="mt-3 flex flex-wrap gap-2">{selected.detectionIndicators.filter(value => !value.startsWith('Record origin: ')).map((indicator, index) => <span key={`${indicator}-${index}`} className="rounded-md border border-line bg-white/[.025] px-2 py-1 text-xs">{indicator.replaceAll('_', ' ')}</span>)}</div></div>
      <div className="mt-6"><h3 className="font-semibold">Evidence</h3>{selected.evidence.filter(item => !item.startsWith('Record origin: ')).length ? <ul className="mt-3 space-y-3">{selected.evidence.filter(item => !item.startsWith('Record origin: ')).map((item, index) => <li key={`${index}-${item}`} className="rounded-lg border border-line p-3 text-sm leading-relaxed">{item}</li>)}</ul> : <p className="mt-2 text-sm muted">No risk evidence. This record is retained for review context.</p>}</div>
      <div className="mt-6 rounded-lg border border-cyan/20 bg-cyan/5 p-4"><div className="text-sm font-semibold">Recommended next action</div><p className="mt-1 text-sm muted">{selected.riskScore >= 40 ? 'Verify the configured brand assets, preserve the source record, and assign an analyst for review.' : 'Check the source context and keep the record low priority unless corroborating evidence appears.'}</p></div>
      <div className="mt-6"><label htmlFor="finding-status" className="mb-2 block text-sm font-semibold">Investigation status</label><select id="finding-status" className="field" value={selected.status} disabled={savingStatus} onChange={event => void updateStatus(selected, event.target.value as Finding['status'])}><option value="NEW">New</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="FALSE_POSITIVE">False positive</option></select><p className="mt-2 text-xs muted">Status changes save to the shared findings store.</p></div>
      <section className="mt-6 border-t border-line pt-5"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Investigation record</h3>{!investigation && <button type="button" className="btn btn-secondary" disabled={savingInvestigation} onClick={() => void openInvestigation()}>{savingInvestigation ? 'Opening…' : 'Open investigation'}</button>}</div>{investigation ? <><label htmlFor="investigation-status" className="mb-2 mt-3 block text-sm font-semibold">Workflow status</label><select id="investigation-status" className="field" disabled={savingInvestigation} value={investigation.status} onChange={event => void updateInvestigationStatus(event.target.value as Investigation['status'])}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="CLOSED">Closed</option></select><p className="mt-2 text-xs muted">{investigation.notes.length} analyst notes · {investigation.assigneeId ? `Assigned to ${investigation.assigneeId}` : 'Unassigned'}</p><label htmlFor="investigation-note" className="mb-2 mt-4 block text-sm font-semibold">Add analyst note</label><textarea id="investigation-note" className="field" rows={3} maxLength={5000} value={noteText} onChange={event => setNoteText(event.target.value)} placeholder="Record observations and next steps"/><button type="button" className="btn btn-primary mt-3" disabled={savingInvestigation || !noteText.trim()} onClick={() => void addNote()}>Save note</button>{investigation.notes.length > 0 && <ol className="mt-4 space-y-2">{investigation.notes.map(note => <li key={note.id} className="rounded-lg border border-line p-3 text-sm"><p>{note.body}</p><p className="mt-2 text-xs muted">{note.authorId} · {new Date(note.createdAt).toLocaleString()}</p></li>)}</ol>}</> : <p className="mt-2 text-sm muted">Open an investigation to save analyst notes with this finding.</p>}</section>
    </aside></div>}
  </div>;
}
