import { NextResponse } from 'next/server';
import { assertOrganisationRequest } from '@/lib/auth';
import { createFinding, listFindings } from '@/lib/finding-store';
import { SEVERITIES } from '@/lib/contracts';

const statuses = ['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'] as const;

function parsePositiveInteger(value: string | null, max: number) {
  if (value === null) return 1;
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(parsed, max) : null;
}

export async function GET(req: Request) {
  try {
    const context = assertOrganisationRequest(req);
    const params = new URL(req.url).searchParams;
    const status = params.get('status');
    const severity = params.get('severity');
    const page = parsePositiveInteger(params.get('page'), 100000);
    const pageSize = parsePositiveInteger(params.get('pageSize'), 100);
    if (status && !statuses.includes(status as typeof statuses[number])) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Finding status is invalid.' } }, { status: 400 });
    }
    if (severity && !SEVERITIES.includes(severity as typeof SEVERITIES[number])) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Finding severity is invalid.' } }, { status: 400 });
    }
    if (page === null || pageSize === null) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Page and pageSize must be positive integers.' } }, { status: 400 });
    }
    return NextResponse.json(await listFindings(context.organisationId, {
      brandId: params.get('brandId') || undefined,
      status: status as typeof statuses[number] | undefined,
      severity: severity as typeof SEVERITIES[number] | undefined,
      page,
      pageSize,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot access another organisation.' } }, { status: 403 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to load findings.' } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const context = assertOrganisationRequest(req);
    return NextResponse.json(await createFinding(await req.json(), context.organisationId), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_ORGANISATION') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'You cannot use another organisation.' } }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'BRAND_NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'The referenced brand was not found.' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Finding input is invalid.' } }, { status: 400 });
  }
}
