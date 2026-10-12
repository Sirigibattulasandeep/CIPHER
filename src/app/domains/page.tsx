import { DomainWorkspace } from '@/components/domain-workspace';
import { listBrands } from '@/lib/store';

export default async function DomainsPage({ searchParams }: { searchParams?: { brandId?: string } }) {
  const brands = await listBrands();
  return <DomainWorkspace brands={brands} initialBrandId={searchParams?.brandId} />;
}
