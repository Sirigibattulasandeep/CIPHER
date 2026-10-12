import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scanDomainCandidates, type DomainCandidate } from '@/lib/domain-monitoring';
import { getDemoOrganisationContext } from '@/lib/auth';
import { getBrand } from '@/lib/store';
import { createFindings } from '@/lib/findings-store';

const itemSchema = z.union([
  z.string().min(1).max(2048).transform((url): DomainCandidate => ({ url, origin: 'IMPORTED' })),
  z.object({
    url: z.string().min(1).max(2048), title: z.string().max(500).optional(),
    description: z.string().max(5000).optional(), observedAt: z.string().datetime().optional(),
    sourceReliability: z.number().min(0).max(1).optional(),
    origin: z.enum(['IMPORTED', 'DEMO']).optional(),
  }).transform(value => ({ ...value, origin: value.origin ?? 'IMPORTED' as const })),
]);
const bodySchema = z.object({
  brandId: z.string().min(1), source: z.enum(['DOMAIN', 'WEBSITE']).default('DOMAIN'),
  records: z.array(itemSchema).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.safeParse(await request.json());
    if (!body.success) return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'Select a brand and provide between 1 and 200 URL records.', fields: body.error.flatten().fieldErrors },
    }, { status: 400 });
    const { brandId, source, records } = body.data;
    const { organisationId } = getDemoOrganisationContext();
    const brand = await getBrand(brandId);
    if (!brand || brand.organisationId !== organisationId) return NextResponse.json({
      error: { code: 'BRAND_NOT_FOUND', message: 'Select a brand in this organisation.' },
    }, { status: 404 });
    const findings = scanDomainCandidates(brand, records, source);
    const savedFindings = findings.length ? await createFindings(findings) : [];
    return NextResponse.json({
      scanned: records.length, created: savedFindings.length, findings: savedFindings,
      message: savedFindings.length ? `Analyzed ${records.length} submitted URLs and saved ${savedFindings.length} records for review.` : 'No review indicators were found in the supplied URLs.',
      networkRequestsMade: 0,
    });
  } catch {
    return NextResponse.json({ error: { code: 'SCAN_FAILED', message: 'The URL analysis request could not be processed.' } }, { status: 400 });
  }
}
