import Link from 'next/link';
import { listBrands } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? '';
  const brands = await listBrands(query);
  const monitored = brands.filter(brand => brand.monitoringConfiguration.enabled).length;

  return <div className="page-shell">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Brand management</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your brand profiles</h1><p className="mt-2 max-w-2xl text-sm leading-6 muted">Keep official domains, social accounts, and apps together so reviews have the right context.</p></div>
      <Link href="/brands/new" className="btn btn-primary">Add a brand <span aria-hidden="true">+</span></Link>
    </header>

    <section className="surface p-4 sm:p-5" aria-label="Brand list and search">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1"><p className="text-sm text-slate-300"><strong className="text-white">{brands.length}</strong> {brands.length === 1 ? 'profile' : 'profiles'}{query ? ` matching “${query}”` : ''}</p><p className="text-xs muted">{monitored} monitoring enabled</p></div>
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <label htmlFor="brand-search" className="sr-only">Search brand profiles</label>
        <input id="brand-search" name="q" defaultValue={query} className="field min-w-[220px] flex-1 sm:max-w-md" placeholder="Search by brand, alias, or domain" />
        <button className="btn btn-secondary" type="submit">Search</button>
        {query && <Link className="btn btn-secondary" href="/brands">Clear</Link>}
      </form>

      {brands.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{brands.map(brand => <article key={brand.id} className="brand-card !items-start !rounded-2xl !p-4">
        <span className="brand-avatar !h-11 !w-11 !rounded-[14px]">{brand.name.trim().charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><Link className="truncate font-semibold text-white hover:text-cyan" href={`/brands/${brand.id}`}>{brand.name}</Link><span className={`brand-state ${brand.monitoringConfiguration.enabled ? 'brand-state-on' : ''}`}>{brand.monitoringConfiguration.enabled ? 'Monitoring on' : 'Paused'}</span></div>
          <p className="mt-1 truncate text-xs muted">{brand.domains[0] || 'No official domain added'}</p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3"><span className="truncate text-[11px] uppercase tracking-wide text-slate-500">{brand.industry.replaceAll('_', ' ').toLowerCase()}</span><Link className="quiet-link shrink-0 text-xs" href={`/brands/${brand.id}`}>View profile <span aria-hidden="true">→</span></Link></div>
        </div>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-[#0b1727] text-xl text-cyan" aria-hidden="true">◇</div>
        <h2 className="mt-4 font-semibold text-white">{query ? 'No matching brands' : 'Start with a brand profile'}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 muted">{query ? 'Try another name, alias, or domain. Your saved profiles are still here.' : 'Add the official details your team uses to recognize a brand, then review suspicious lookalikes with that context.'}</p>
        {query ? <Link className="btn btn-secondary mt-5" href="/brands">Show all profiles</Link> : <Link className="btn btn-primary mt-5" href="/brands/new">Create your first profile</Link>}
      </div>}
    </section>
  </div>;
}
