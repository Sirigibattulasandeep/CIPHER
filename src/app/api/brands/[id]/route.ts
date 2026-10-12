import { NextResponse } from 'next/server'; import { brandSchema } from '@/lib/contracts'; import { deleteBrand, getBrand, updateBrand } from '@/lib/store';
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const brand = await getBrand(id);
  return brand
    ? NextResponse.json(brand)
    : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Brand not found' } }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const parsed = brandSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({
    error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fields: parsed.error.flatten().fieldErrors },
  }, { status: 400 });
  const brand = await updateBrand(id, parsed.data);
  return brand
    ? NextResponse.json(brand)
    : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Brand not found' } }, { status: 404 });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const result = await deleteBrand(id);
  if (result === 'deleted') return new NextResponse(null, { status: 204 });
  if (result === 'has_findings') return NextResponse.json({
    error: { code: 'BRAND_HAS_FINDINGS', message: 'This brand still has saved findings. Resolve or remove them before deleting the brand.' },
  }, { status: 409 });
  return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Brand not found' } }, { status: 404 });
}
