import { NextResponse } from 'next/server';
import { getDemoOrganisationContext } from '@/lib/auth';
import { addOfficialAsset } from '@/lib/store';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { organisationId } = getDemoOrganisationContext();
    const asset = await addOfficialAsset(id, await req.json(), organisationId);
    return asset
      ? NextResponse.json(asset, { status: 201 })
      : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Brand not found' } }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot modify another organisation.' } }, { status: 403 });
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Official asset input is invalid.' } }, { status: 400 });
  }
}
