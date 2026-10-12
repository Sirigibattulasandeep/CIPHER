import { MonitoringWorkspace } from '@/components/monitoring-workspace';
import { listBrands } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function MonitoringPage({ searchParams }: { searchParams: Promise<{ brandId?: string }> }) {
  const brands = await listBrands();
  return <MonitoringWorkspace brands={brands} initialBrandId={(await searchParams).brandId} />;
}
