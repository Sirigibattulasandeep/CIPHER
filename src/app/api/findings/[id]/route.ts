import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertOrganisationRequest } from '@/lib/auth';
import { getFinding } from '@/lib/finding-store';
import { updateFindingStatus } from '@/lib/findings-store';

const statusSchema = z.enum(['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']);

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const context = assertOrganisationRequest(request);
    const finding = await getFinding(params.id, context.organisationId);
    return finding
      ? NextResponse.json(finding)
      : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Finding not found' } }, { status: 404 });
  } catch (error) {
    return error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION'
      ? NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot access another organisation.' } }, { status: 403 })
      : NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to load finding.' } }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    assertOrganisationRequest(request);
    const parsed = z.object({ status: statusSchema }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'Choose a valid investigation status.', fields: parsed.error.flatten().fieldErrors },
    }, { status: 400 });
    const finding = await updateFindingStatus(params.id, parsed.data.status);
    return finding
      ? NextResponse.json(finding)
      : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Finding not found.' } }, { status: 404 });
  } catch (error) {
    return error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION'
      ? NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot access another organisation.' } }, { status: 403 })
      : NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
