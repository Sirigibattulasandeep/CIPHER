import { NextResponse } from 'next/server';
import { z } from 'zod';
import { scanRecords, type AppCandidate, type RecordOrigin, type SocialCandidate } from '@/lib/social-monitoring';
import { getBrand } from '@/lib/store';
import { getDemoOrganisationContext } from '@/lib/auth';

const origin = z.enum(['CONNECTED', 'IMPORTED', 'DEMO']);
const post = z.object({ id: z.string().optional(), text: z.string().default(''), url: z.string().optional(), observedAt: z.string().optional(), observed_at: z.string().optional() }).passthrough();
const social = z.object({
  id: z.string().optional(), platform: z.string().default('Unknown'), handle: z.string().default(''),
  displayName: z.string().optional(), display_name: z.string().optional(), bio: z.string().optional(),
  profileUrl: z.string().optional(), profile_url: z.string().optional(), links: z.array(z.string()).default([]),
  posts: z.array(post).default([]), verified: z.boolean().nullable().optional(),
  avatarSimilarity: z.number().nullable().optional(), avatar_similarity: z.number().nullable().optional(),
  sourceReliability: z.number().min(0).max(1).optional(), source_reliability: z.number().min(0).max(1).optional(),
  origin: origin.optional(), source: z.string().optional(), observedAt: z.string().optional(), observed_at: z.string().optional(),
}).passthrough().transform((row): SocialCandidate => ({
  id: row.id, platform: row.platform, handle: row.handle, displayName: row.displayName ?? row.display_name,
  bio: row.bio, profileUrl: row.profileUrl ?? row.profile_url,
  links: row.links, posts: row.posts.map(item => ({ ...item, observedAt: item.observedAt ?? item.observed_at })),
  verified: row.verified, avatarSimilarity: row.avatarSimilarity ?? row.avatar_similarity,
  sourceReliability: row.sourceReliability ?? row.source_reliability,
  origin: normalizeOrigin(row.origin ?? row.source), observedAt: row.observedAt ?? row.observed_at,
}));

const app = z.object({
  id: z.string().optional(), store: z.string().optional(), platform: z.string().optional(),
  appId: z.string().optional(), app_id: z.string().optional(), package_name: z.string().optional(),
  name: z.string().optional(), app_name: z.string().optional(), publisher: z.string().optional(),
  description: z.string().optional(), storeUrl: z.string().optional(), store_url: z.string().optional(),
  links: z.union([z.array(z.string()), z.string()]).optional(),
  logoSimilarity: z.number().nullable().optional(), logo_similarity: z.number().nullable().optional(),
  sourceReliability: z.number().min(0).max(1).optional(), source_reliability: z.number().min(0).max(1).optional(),
  origin: origin.optional(), source: z.string().optional(), observedAt: z.string().optional(), observed_at: z.string().optional(),
}).passthrough().transform((row): AppCandidate => ({
  id: row.id, store: row.store ?? row.platform ?? 'Unknown', appId: row.appId ?? row.app_id ?? row.package_name ?? '',
  name: row.name ?? row.app_name ?? '', publisher: row.publisher, description: row.description,
  storeUrl: row.storeUrl ?? row.store_url,
  links: typeof row.links === 'string' ? [row.links] : row.links,
  logoSimilarity: row.logoSimilarity ?? row.logo_similarity,
  sourceReliability: row.sourceReliability ?? row.source_reliability,
  origin: normalizeOrigin(row.origin ?? row.source), observedAt: row.observedAt ?? row.observed_at,
}));

const bodySchema = z.object({ brandId: z.string().min(1), kind: z.enum(['social', 'apps']), records: z.array(z.unknown()).min(1).max(500) });

function normalizeOrigin(value: string | undefined): RecordOrigin | undefined {
  const normalized = value?.toLocaleUpperCase();
  return normalized === 'CONNECTED' || normalized === 'IMPORTED' || normalized === 'DEMO' ? normalized : undefined;
}

export async function POST(request: Request) {
  try {
    const requestBody = bodySchema.safeParse(await request.json());
    if (!requestBody.success) return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'Select a brand and provide between 1 and 500 records.', fields: requestBody.error.flatten().fieldErrors },
    }, { status: 400 });
    const { brandId, kind, records } = requestBody.data;
    const { organisationId } = getDemoOrganisationContext();
    const brand = await getBrand(brandId);
    if (!brand || brand.organisationId !== organisationId) return NextResponse.json({
      error: { code: 'BRAND_NOT_FOUND', message: 'Select a brand in this organisation.' },
    }, { status: 404 });

    const parsed = kind === 'social' ? z.array(social).safeParse(records) : z.array(app).safeParse(records);
    if (!parsed.success) return NextResponse.json({
      error: { code: 'INVALID_RECORDS', message: 'Candidate records have invalid fields.', fields: parsed.error.flatten().fieldErrors },
    }, { status: 400 });
    const findings = scanRecords(brand, kind, parsed.data, new Date().toISOString());
    return NextResponse.json({ scanned: records.length, created: findings.length, findings,
      message: findings.length ? `Scanned ${records.length} records and found ${findings.length} records for review.` : 'No review indicators were found in the supplied records.' });
  } catch {
    return NextResponse.json({ error: { code: 'SCAN_FAILED', message: 'The scan request could not be processed.' } }, { status: 400 });
  }
}
