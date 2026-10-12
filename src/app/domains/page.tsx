import { DomainWorkspace } from '@/components/domain-workspace';
import { listBrands } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function DomainsPage({ searchParams }: { searchParams: Promise<{ brandId?: string }> }) {
  const brands = await listBrands();
  return <DomainWorkspace brands={brands} initialBrandId={(await searchParams).brandId} />;
}
