import { MonitoringWorkspace } from '@/components/monitoring-workspace';
import { listBrands } from '@/lib/store';

export default async function MonitoringPage({ searchParams }: { searchParams?: { brandId?: string } }) {
  const brands = await listBrands();
  return <MonitoringWorkspace brands={brands} initialBrandId={searchParams?.brandId} />;
}
