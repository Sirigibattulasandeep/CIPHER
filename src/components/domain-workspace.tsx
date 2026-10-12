'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Brand, Finding } from '@/lib/contracts';

type Props = { brands: Brand[]; initialBrandId?: string };

export function DomainWorkspace({ brands, initialBrandId }: Props) {
  const [brandId, setBrandId] = useState(initialBrandId ?? brands[0]?.id ?? '');
  const [source, setSource] = useState<'DOMAIN' | 'WEBSITE'>('DOMAIN');
  const [urls, setUrls] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const brand = brands.find(item => item.id === brandId);

  const refresh = useCallback(async () => {
    if (!brandId) { setFindings([]); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/findings?brandId=${encodeURIComponent(brandId)}&source=${source}`);
      if (!response.ok) throw new Error('Could not load findings.');
      setFindings(await response.json() as Finding[]);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load findings.'); }
    finally { setLoading(false); }
  }, [brandId, source]);

  useEffect(() => { void refresh(); }, [refresh]);

  const demoUrls = useMemo(() => brand ? [
    { url: `https://${brand.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '')}-support.example/login`, title: `${brand.name} official support`, description: 'Verify your account and claim your reward.', origin: 'DEMO' as const },
    { url: `https://${brand.domains[0] ?? 'official.example'}`, title: `${brand.name} official website`, description: 'The configured official domain should be excluded.', origin: 'DEMO' as const },
    { url: 'https://unrelated-stargazer.example', title: 'Stargazer astronomy guide', description: 'Explore constellations.', origin: 'DEMO' as const },
  ] : [], [brand]);

  async function runScan(records?: Array<{ url: string; title?: string; description?: string; origin?: 'DEMO' }>) {
    setScanning(true); setError(''); setMessage('');
    try {
      const submitted = records ?? urls.split(/\r?\n/).map(value => value.trim()).filter(Boolean).map(url => ({ url, origin: 'IMPORTED' as const }));
      if (!brandId || submitted.length === 0) throw new Error('Select a brand and enter at least one URL.');
      const response = await fetch('/api/monitoring/domains', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ brandId, source, records: submitted }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'URL analysis failed.');
      setMessage(`${result.message} No network requests were made.`);
      if (!records) setUrls('');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'URL analysis failed.'); }
    finally { setScanning(false); }
  }

  return <div className="p-5 md:p-9">
    <header className="mb-7"><div className="eyebrow">Manual URL analysis</div><h1 className="mt-2 text-3xl font-bold">Websites &amp; domains</h1><p className="mt-2 max-w-3xl muted">Check user-submitted domains and page metadata against configured brand assets. This prototype does not visit URLs, expand redirects, or verify malicious behavior.</p></header>
    {!brands.length ? <section className="surface p-7"><h2 className="text-xl font-semibold">Add a brand profile to begin</h2><p className="mt-2 muted">Set official domains and aliases to enable useful comparisons.</p></section> : <>
      <section className="surface p-5 md:p-6"><div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="domain-brand" className="mb-2 block text-sm font-semibold">Brand</label><select id="domain-brand" className="field" value={brandId} onChange={event => setBrandId(event.target.value)}>{brands.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="domain-source" className="mb-2 block text-sm font-semibold">Analysis type</label><select id="domain-source" className="field" value={source} onChange={event => setSource(event.target.value as 'DOMAIN' | 'WEBSITE')}><option value="DOMAIN">Domain indicators</option><option value="WEBSITE">Submitted website metadata</option></select></div></div>
        <label htmlFor="domain-urls" className="mb-2 mt-5 block text-sm font-semibold">URLs, one per line</label><textarea id="domain-urls" rows={6} className="field font-mono text-sm" value={urls} onChange={event => setUrls(event.target.value)} placeholder={'https://brand-support.example/login\nhttps://example.com'} />
        <div className="mt-4 flex flex-wrap items-center gap-3"><button className="btn btn-primary" disabled={scanning || !urls.trim()} onClick={() => void runScan()}>{scanning ? 'Analyzing…' : 'Analyze submitted URLs'}</button><button className="btn btn-secondary" disabled={scanning || !brandId} onClick={() => void runScan(demoUrls)}>Load simulated examples</button><span className="text-xs muted">Maximum 200 entries per scan · local analysis only · no browsing</span></div>
      </section>
      {(error || message) && <div className={`mt-4 rounded-lg border p-3 text-sm ${error ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-teal/25 bg-teal/10 text-teal-100'}`} role={error ? 'alert' : 'status'}>{error || message}</div>}
      <section className="mt-8"><div className="eyebrow">Saved review queue</div><h2 className="mt-2 text-xl font-semibold">{source === 'DOMAIN' ? 'Domain findings' : 'Website findings'} <span className="text-sm font-normal muted">for {brand?.name}</span></h2>
        <div className="surface mt-4 divide-y divide-line">{loading ? <div className="space-y-3 p-5" aria-label="Loading findings"><div className="h-12 animate-pulse rounded bg-white/5" /><div className="h-12 animate-pulse rounded bg-white/5" /></div> : findings.length ? findings.map(finding => <article key={finding.id} className="flex flex-wrap items-start justify-between gap-4 p-5"><div className="min-w-0"><h3 className="font-semibold">{finding.title}</h3><p className="mt-1 break-all text-sm muted">{finding.sourceUrl}</p><p className="mt-2 text-sm">{finding.description}</p><p className="mt-2 text-xs muted">{finding.evidence.find(item => item.startsWith('Record origin:'))} · Confidence {finding.confidence}%</p></div><div className="shrink-0 text-right"><span className="rounded-full border border-line px-3 py-1 text-xs">{finding.severity}</span><p className="mt-2 text-sm muted">{finding.riskScore}/100</p></div><ul className="basis-full flex flex-wrap gap-2">{finding.detectionIndicators.filter(value => !value.startsWith('Record origin:')).map(value => <li key={value} className="rounded border border-line px-2 py-1 text-xs">{value.replaceAll('_', ' ')}</li>)}</ul></article>) : <p className="p-8 text-sm muted">No matching findings. Analyze submitted URLs or adjust the selected module.</p>}</div>
      </section>
    </>}
  </div>;
}
