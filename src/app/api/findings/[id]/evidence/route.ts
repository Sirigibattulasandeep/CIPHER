import { NextResponse } from 'next/server'; import { assertOrganisationRequest } from '@/lib/auth'; import { addEvidence } from '@/lib/finding-store';
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const context = assertOrganisationRequest(req);
    const evidence = await addEvidence(id, await req.json(), context.organisationId);
    return evidence
      ? NextResponse.json(evidence, { status: 201 })
      : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Finding not found' } }, { status: 404 });
  } catch (error) {
    return error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION'
      ? NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot modify another organisation.' } }, { status: 403 })
      : NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Evidence input is invalid.' } }, { status: 400 });
  }
}
