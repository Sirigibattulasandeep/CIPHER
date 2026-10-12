'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { INDUSTRIES, type Brand, type BrandInput } from '@/lib/contracts';

const lines = (value: string) => value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);

export function BrandForm({ brand }: { brand?: Brand }) {
  const router = useRouter();
  const [name, setName] = useState(brand?.name ?? '');
  const [industry, setIndustry] = useState<BrandInput['industry']>(brand?.industry ?? 'TECHNOLOGY_SAAS');
  const [websiteUrl, setWebsiteUrl] = useState(brand?.websiteUrl ?? '');
  const [logoUrl, setLogoUrl] = useState(brand?.logoUrl ?? '');
  const [description, setDescription] = useState(brand?.description ?? '');
  const [aliases, setAliases] = useState((brand?.aliases ?? []).join('\n'));
  const [domains, setDomains] = useState((brand?.domains ?? []).join('\n'));
  const [socialProfiles, setSocialProfiles] = useState((brand?.socialProfiles ?? []).join('\n'));
  const [apps, setApps] = useState<BrandInput['mobileApplications']>(brand?.mobileApplications ?? []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateApp(index: number, key: keyof BrandInput['mobileApplications'][number], value: string) {
    setApps(current => current.map((app, appIndex) => appIndex === index ? { ...app, [key]: value } : app));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const body: BrandInput = {
      name, industry, websiteUrl, logoUrl, description, aliases: lines(aliases), domains: lines(domains),
      socialProfiles: lines(socialProfiles), mobileApplications: apps.filter(app => app.name || app.packageId || app.storeUrl),
      subcategory: brand?.subcategory ?? '', keywords: brand?.keywords ?? [],
      impersonationIndicators: brand?.impersonationIndicators ?? [],
      monitoringConfiguration: brand?.monitoringConfiguration ?? { enabled: true, modules: ['social', 'web', 'apps'], rules: [], frequency: 'daily' },
    };
    try {
      const response = await fetch(brand ? `/api/brands/${brand.id}` : '/api/brands', {
        method: brand ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? 'Could not save brand profile.');
        setSaving(false);
        return;
      }
      router.push(`/brands/${result.id}`);
      router.refresh();
    } catch {
      setError('Could not reach SENTRIX. Check your connection and try again.');
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="surface max-w-3xl space-y-7 p-6 md:p-8">
    <section className="space-y-5">
      <div><div className="eyebrow">Brand identity</div><h2 className="mt-2 text-lg font-semibold">Define the legitimate brand</h2></div>
      <div className="grid gap-5 md:grid-cols-2">
        <div><label htmlFor="brand-name" className="mb-2 block text-sm font-semibold">Brand name</label><input id="brand-name" required minLength={2} className="field" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. KampusVC" /></div>
        <div><label htmlFor="brand-industry" className="mb-2 block text-sm font-semibold">Industry</label><select id="brand-industry" className="field" value={industry} onChange={event => setIndustry(event.target.value as BrandInput['industry'])}>{INDUSTRIES.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></div>
        <div><label htmlFor="brand-website" className="mb-2 block text-sm font-semibold">Official website</label><input id="brand-website" type="url" className="field" value={websiteUrl} onChange={event => setWebsiteUrl(event.target.value)} placeholder="https://example.com" /></div>
        <div><label htmlFor="brand-logo" className="mb-2 block text-sm font-semibold">Official logo URL</label><input id="brand-logo" type="url" className="field" value={logoUrl} onChange={event => setLogoUrl(event.target.value)} placeholder="https://example.com/logo.png" /><p className="mt-1 text-xs muted">Image comparison is supplied as an analysis signal; this prototype doesn’t fetch or compare images.</p></div>
      </div>
      <div><label htmlFor="brand-description" className="mb-2 block text-sm font-semibold">Description</label><textarea id="brand-description" rows={3} className="field" value={description} onChange={event => setDescription(event.target.value)} placeholder="What should our detection engine know about this brand?" /></div>
      <div><label htmlFor="brand-aliases" className="mb-2 block text-sm font-semibold">Brand aliases</label><textarea id="brand-aliases" rows={2} className="field" value={aliases} onChange={event => setAliases(event.target.value)} placeholder={'One name per line\nShort names, product names, or former names'} /></div>
    </section>

    <section className="space-y-5 border-t border-line pt-6">
      <div><div className="eyebrow">Official presence</div><h2 className="mt-2 text-lg font-semibold">Give detection a trusted reference</h2></div>
      <div><label htmlFor="brand-domains" className="mb-2 block text-sm font-semibold">Official domains</label><textarea id="brand-domains" rows={2} className="field" value={domains} onChange={event => setDomains(event.target.value)} placeholder={'One domain or URL per line\nexample.com'} /></div>
      <div><label htmlFor="brand-social" className="mb-2 block text-sm font-semibold">Official social profile URLs</label><textarea id="brand-social" rows={3} className="field" value={socialProfiles} onChange={event => setSocialProfiles(event.target.value)} placeholder={'One profile URL per line\nhttps://www.linkedin.com/company/example'} /></div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><label className="block text-sm font-semibold">Official mobile applications</label><p className="mt-1 text-xs muted">Use the store package or listing ID to keep official apps out of impersonation alerts.</p></div><button type="button" className="btn btn-secondary" onClick={() => setApps(current => [...current, { name: '', storeUrl: '', publisher: '', packageId: '' }])}>Add app</button></div>
        <div className="mt-3 space-y-3">{apps.map((app, index) => <div key={`${index}-${app.packageId}`} className="grid gap-3 rounded-lg border border-line p-4 md:grid-cols-2">
          <div><label htmlFor={`app-name-${index}`} className="mb-1 block text-xs muted">App name</label><input id={`app-name-${index}`} className="field" value={app.name} onChange={event => updateApp(index, 'name', event.target.value)} placeholder="App name" /></div>
          <div><label htmlFor={`app-id-${index}`} className="mb-1 block text-xs muted">Package / listing ID</label><input id={`app-id-${index}`} className="field" value={app.packageId} onChange={event => updateApp(index, 'packageId', event.target.value)} placeholder="com.example.app" /></div>
          <div><label htmlFor={`app-publisher-${index}`} className="mb-1 block text-xs muted">Publisher</label><input id={`app-publisher-${index}`} className="field" value={app.publisher} onChange={event => updateApp(index, 'publisher', event.target.value)} placeholder="Official publisher" /></div>
          <div><label htmlFor={`app-url-${index}`} className="mb-1 block text-xs muted">Store listing URL</label><input id={`app-url-${index}`} type="url" className="field" value={app.storeUrl} onChange={event => updateApp(index, 'storeUrl', event.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" /></div>
          <div className="md:col-span-2"><button type="button" className="text-sm text-rose-300 hover:text-rose-200" onClick={() => setApps(current => current.filter((_, appIndex) => appIndex !== index))}>Remove app</button></div>
        </div>)}</div>
      </div>
    </section>

    {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
    <div className="flex flex-wrap gap-3 border-t border-line pt-5"><button disabled={saving} className="btn btn-primary" type="submit">{saving ? 'Saving…' : brand ? 'Save brand profile' : 'Create brand profile'}</button><button className="btn btn-secondary" type="button" onClick={() => router.back()}>Cancel</button></div>
  </form>;
}
