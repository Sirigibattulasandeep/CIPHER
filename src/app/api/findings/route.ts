import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findingSchema } from '@/lib/contracts';
import { createFindings, listFindings } from '@/lib/findings-store';
import { getBrand } from '@/lib/store';
import { getDemoOrganisationContext } from '@/lib/auth';

const sourceSchema = z.enum(['SOCIAL', 'MOBILE_APP', 'WEBSITE', 'DOMAIN']);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = sourceSchema.safeParse(params.get('source'));
  const findings = await listFindings({
    brandId: params.get('brandId') || undefined,
    source: source.success ? source.data : undefined,
    q: params.get('q') || undefined,
  });
  return NextResponse.json(findings);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const values = Array.isArray(body) ? body : [body];
    const parsed = z.array(findingSchema).max(500).safeParse(values);
    if (!parsed.success) return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'One or more findings do not match the shared contract.', fields: parsed.error.flatten().fieldErrors },
    }, { status: 400 });

    const { organisationId } = getDemoOrganisationContext();
    for (const finding of parsed.data) {
      const brand = await getBrand(finding.brandId);
      if (!brand || brand.organisationId !== organisationId) return NextResponse.json({
        error: { code: 'BRAND_NOT_FOUND', message: 'Finding references an unavailable brand.' },
      }, { status: 404 });
    }
    const saved = await createFindings(parsed.data.map(finding => ({ ...finding, organisationId })));
    return NextResponse.json(saved, { status: 201 });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
