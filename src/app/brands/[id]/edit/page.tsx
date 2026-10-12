import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/store';
import { BrandForm } from '@/components/brand-form';

export const dynamic = 'force-dynamic';

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrand(id);
  if (!brand) notFound();
  return <div className="p-6 md:p-10"><div className="eyebrow">Brand management</div><h1 className="mb-8 mt-2 text-3xl font-bold">Edit {brand.name}</h1><BrandForm brand={brand} /></div>;
}
