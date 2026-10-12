'use client';

import { useEffect, useRef, useState } from 'react';
import type { FindingRecord } from '@/lib/finding-store';

type FindingPage = { items: FindingRecord[]; total: number; page: number; pageSize: number; totalPages: number };
type Props = { initialPage: FindingPage; brandNames: Record<string, string> };

const statuses = ['ALL', 'NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'] as const;
const severities = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const;

function isFindingPage(value: unknown): value is FindingPage {
  if (!value || typeof value !== 'object') return false;
  const page = value as Partial<FindingPage>;
  return Array.isArray(page.items) && [page.total, page.page, page.pageSize, page.totalPages].every(item => typeof item === 'number');
}

export function FindingsBrowser({ initialPage, brandNames }: Props) {
  const [result, setResult] = useState(initialPage);
  const [status, setStatus] = useState<(typeof statuses)[number]>('ALL');
  const [severity, setSeverity] = useState<(typeof severities)[number]>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    const params = new URLSearchParams({ page: String(page), pageSize: String(initialPage.pageSize) });
    if (status !== 'ALL') params.set('status', status);
    if (severity !== 'ALL') params.set('severity', severity);

    setLoading(true);
    setError('');
    fetch(`/api/findings?${params.toString()}`, { signal: controller.signal })
      .then(async response => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' && 'message' in body.error && typeof body.error.message === 'string'
            ? body.error.message
            : 'Findings could not be loaded.';
          throw new Error(message);
        }
        if (!isFindingPage(body)) throw new Error('The findings response was invalid.');
        if (sequence === requestSequence.current) setResult(body);
      })
      .catch(requestError => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        if (sequence === requestSequence.current) setError(requestError instanceof Error ? requestError.message : 'Findings could not be loaded.');
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });

    return () => controller.abort();
  }, [initialPage.pageSize, page, reloadToken, severity, status]);

  const changeStatus = (value: (typeof statuses)[number]) => { setStatus(value); setPage(1); };
  const changeSeverity = (value: (typeof severities)[number]) => { setSeverity(value); setPage(1); };
  const retry = () => setReloadToken(current => current + 1);

  return <>
    <div className="surface mt-8 flex flex-wrap items-end gap-4 p-4">
      <div className="min-w-44">
        <label className="mb-2 block text-sm font-semibold" htmlFor="finding-status">Status</label>
        <select id="finding-status" className="field" value={status} onChange={event => changeStatus(event.target.value as (typeof statuses)[number])}>
          {statuses.map(value => <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : value}</option>)}
        </select>
      </div>
      <div className="min-w-44">
        <label className="mb-2 block text-sm font-semibold" htmlFor="finding-severity">Severity</label>
        <select id="finding-severity" className="field" value={severity} onChange={event => changeSeverity(event.target.value as (typeof severities)[number])}>
          {severities.map(value => <option key={value} value={value}>{value === 'ALL' ? 'All severities' : value}</option>)}
        </select>
      </div>
      <p className="ml-auto text-sm muted" aria-live="polite">{result.total} total findings</p>
    </div>

    {error && <div className="mt-4 surface p-4" role="alert"><p className="text-sm text-rose-300">{error}</p><button className="btn btn-secondary mt-3" type="button" onClick={retry}>Try again</button></div>}
    <div className={`surface mt-4 overflow-hidden ${loading ? 'opacity-70' : ''}`} aria-busy={loading}>
      {loading && <p className="border-b border-line p-4 text-sm muted" role="status">Loading findings…</p>}
      {result.items.length ? <div className="divide-y divide-line">{result.items.map(finding => <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto_auto] md:items-center" key={finding.id}><div><div className="font-semibold">{finding.title}</div><div className="mt-1 text-sm muted">{brandNames[finding.brandId] || 'Unknown brand'} · {finding.affectedEntity}</div></div><span className="rounded-full border border-line px-3 py-1 text-xs">{finding.severity}</span><span className="text-sm muted">{finding.status}</span></div>)}</div> : !loading && <div className="p-12 text-center"><div className="text-lg font-semibold">No findings found</div><p className="mt-2 muted">Try changing the filters or review your monitored brands.</p></div>}
    </div>
    <div className="mt-4 flex items-center justify-between gap-4" aria-label="Findings pagination">
      <button className="btn btn-secondary" type="button" disabled={loading || result.page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
      <span className="text-sm muted" aria-live="polite">Page {result.page} of {result.totalPages}</span>
      <button className="btn btn-secondary" type="button" disabled={loading || result.page >= result.totalPages} onClick={() => setPage(current => Math.min(result.totalPages, current + 1))}>Next</button>
    </div>
  </>;
}
