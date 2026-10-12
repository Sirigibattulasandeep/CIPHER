import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { brandSchema, officialAssetSchema, type Brand, type BrandInput } from './contracts';
import { getDemoOrganisationContext } from './auth';
import { prisma } from './prisma';

const file = path.join(process.env.SENTRIX_DATA_DIR || path.join(process.cwd(), 'data'), 'brands.json');
const useDatabase = Boolean(process.env.DATABASE_URL);

type DatabaseBrand = Prisma.BrandGetPayload<{ include: { monitoringConfiguration: true; officialAssets: true } }>;

function fromDatabase(row: DatabaseBrand): Brand {
  const input = parseStoredBrand({ ...row,
    description: row.description ?? '', logoUrl: row.logoUrl ?? '', subcategory: row.subcategory ?? '', websiteUrl: row.websiteUrl ?? '',
    officialAssets: row.officialAssets.map(asset => ({ ...asset, verificationSource: 'database' })),
  });
  return { ...input, id: row.id, organisationId: row.organisationId,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
}

function normalizedAssets(input: BrandInput) {
  const social = input.socialProfiles.map(profile => {
    const url = new URL(profile.profileUrl);
    return { platform: profile.platform || url.hostname.toLocaleLowerCase().replace(/^www\./, ''), handle: profile.handle.replace(/^@/, ''), profileUrl: profile.profileUrl };
  });
  return {
    brandAliases: input.aliases.filter(Boolean).map(value => ({ value, normalized: normalize(value) })).filter(value => value.normalized),
    brandKeywords: input.keywords.filter(Boolean).map(value => ({ value, normalized: normalize(value) })).filter(value => value.normalized),
    officialDomains: [...new Set(input.domains.map(value => value.toLocaleLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '').replace(/\.$/, '')).filter(Boolean))].map(domain => ({ domain })),
    officialSocialAccounts: social.filter(value => value.handle),
    officialMobileApplications: input.mobileApplications.filter(value => value.packageId.trim()).map(value => ({
      name: value.name, packageId: value.packageId.trim(), storeUrl: value.storeUrl || null, publisher: value.publisher || null,
    })),
  };
}

function databaseData(input: BrandInput): Prisma.BrandCreateInput {
  const assets = normalizedAssets(input);
  return {
    name: input.name, organisation: { connect: { id: getDemoOrganisationContext().organisationId } },
    aliases: input.aliases as Prisma.InputJsonValue, description: input.description || null, logoUrl: input.logoUrl || null,
    industry: input.industry, subcategory: input.subcategory || null, websiteUrl: input.websiteUrl || null,
    domains: input.domains as Prisma.InputJsonValue, socialProfiles: input.socialProfiles as Prisma.InputJsonValue,
    keywords: input.keywords as Prisma.InputJsonValue, impersonationIndicators: input.impersonationIndicators as Prisma.InputJsonValue,
    mobileApplications: input.mobileApplications as Prisma.InputJsonValue,
    monitoringConfiguration: { create: input.monitoringConfiguration },
    brandAliases: { create: assets.brandAliases }, brandKeywords: { create: assets.brandKeywords },
    officialDomains: { create: assets.officialDomains }, officialSocialAccounts: { create: assets.officialSocialAccounts },
    officialMobileApplications: { create: assets.officialMobileApplications },
    officialAssets: { create: [
      ...(input.logoUrl ? [{ type: 'LOGO', url: input.logoUrl, label: 'Configured brand logo' }] : []),
      ...input.officialAssets.map(asset => ({ type: asset.type, url: asset.url, label: asset.label || null, verified: asset.verified })),
    ] },
  };
}

function parseStoredBrand(value: Record<string, unknown>): BrandInput {
  const socialProfiles = Array.isArray(value.socialProfiles) ? value.socialProfiles.map(profile => {
    if (typeof profile !== 'string') return profile;
    try {
      const url = new URL(profile);
      const handle = url.pathname.split('/').filter(Boolean).at(-1)?.replace(/^@/, '') ?? '';
      return { platform: url.hostname.replace(/^www\./, ''), profileUrl: profile, handle, profileId: '', verificationSource: 'legacy-import', status: 'UNCONFIRMED' };
    } catch { return profile; }
  }) : [];
  const mobileApplications = Array.isArray(value.mobileApplications) ? value.mobileApplications.map(application =>
    application && typeof application === 'object' ? { platform: 'OTHER', verificationSource: 'legacy-import', status: 'UNCONFIRMED', ...(application as Record<string, unknown>) } : application,
  ) : [];
  return brandSchema.parse({ ...value, socialProfiles, mobileApplications, officialAssets: value.officialAssets ?? [] });
}

function demoBrands(organisationId: string): Brand[] {
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString();
  const inputs: Array<[string, BrandInput]> = [
    ['brand_kampusvc', { name: 'Kampus.VC', aliases: ['Kampus VC'], description: 'Demo brand profile based on the company named in the SENTRIX challenge brief.', logoUrl: '', industry: 'EDTECH', subcategory: 'Venture studio and university ecosystem', websiteUrl: 'https://kampus.vc', domains: ['kampus.vc'], socialProfiles: [], keywords: ['Kampus', 'venture studio'], impersonationIndicators: ['official', 'support'], mobileApplications: [], officialAssets: [], monitoringConfiguration: { enabled: true, modules: ['social', 'web', 'apps'], rules: [], frequency: 'daily' } }],
    ['brand_northstar', { name: 'Northstar Bank', aliases: ['Northstar'], description: 'Fictional fintech brand used only for deterministic demo scans.', logoUrl: '', industry: 'FINTECH', subcategory: 'Digital banking', websiteUrl: 'https://northstar-bank.example', domains: ['northstar-bank.example'], socialProfiles: [{ platform: 'X', profileUrl: 'https://x.com/northstarbank', handle: 'northstarbank', profileId: '', verificationSource: 'demo', status: 'ACTIVE' }], keywords: ['banking', 'account'], impersonationIndicators: ['support', 'login'], mobileApplications: [{ name: 'Northstar Mobile Banking', platform: 'ANDROID', storeUrl: '', publisher: 'Northstar Demo Bank', packageId: 'example.northstar.mobile', verificationSource: 'demo', status: 'ACTIVE' }], officialAssets: [], monitoringConfiguration: { enabled: true, modules: ['social', 'web', 'apps'], rules: [], frequency: 'daily' } }],
    ['brand_cedarfinch', { name: 'Cedar & Finch', aliases: ['Cedar Finch'], description: 'Fictional e-commerce brand used only for deterministic demo scans.', logoUrl: '', industry: 'ECOMMERCE', subcategory: 'Retail', websiteUrl: 'https://cedarfinch.example', domains: ['cedarfinch.example'], socialProfiles: [{ platform: 'Instagram', profileUrl: 'https://www.instagram.com/cedarfinch', handle: 'cedarfinch', profileId: '', verificationSource: 'demo', status: 'ACTIVE' }], keywords: ['shop', 'orders'], impersonationIndicators: ['support', 'offers'], mobileApplications: [{ name: 'Cedar & Finch Shop', platform: 'ANDROID', storeUrl: '', publisher: 'Cedar Finch Demo', packageId: 'example.cedarfinch.shop', verificationSource: 'demo', status: 'ACTIVE' }], officialAssets: [], monitoringConfiguration: { enabled: true, modules: ['social', 'web', 'apps'], rules: [], frequency: 'daily' } }],
  ];
  return inputs.map(([id, input]) => ({ ...brandSchema.parse(input), id, organisationId, createdAt: now, updatedAt: now }));
}

async function read(): Promise<Brand[]> {
  if (useDatabase) {
    const { organisationId } = getDemoOrganisationContext();
    const rows = await prisma.brand.findMany({ where: { organisationId }, include: { monitoringConfiguration: true, officialAssets: true }, orderBy: { name: 'asc' } });
    return rows.map(fromDatabase);
  }
  try {
    const raw: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(raw)) throw new Error('Brand data must be a JSON array.');
    return raw.map(item => {
      const value = item as Record<string, unknown>;
      const parsed = parseStoredBrand(value);
      if (typeof value.id !== 'string' || typeof value.organisationId !== 'string' || typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
        throw new Error('Brand data is missing required record metadata.');
      }
      return { ...parsed, id: value.id, organisationId: value.organisationId, createdAt: value.createdAt, updatedAt: value.updatedAt };
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const { organisationId } = getDemoOrganisationContext();
    const brands = demoBrands(organisationId);
    await write(brands);
    return brands;
  }
}

async function write(brands: Brand[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(brands, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

export async function listBrands(query = ''): Promise<Brand[]> {
  const { organisationId } = getDemoOrganisationContext();
  const all = await read();
  const normalizedQuery = query.toLocaleLowerCase();
  return all.filter(brand => brand.organisationId === organisationId && (!normalizedQuery || [brand.name, ...brand.aliases, ...brand.domains]
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery))));
}

export async function getBrand(id: string): Promise<Brand | undefined> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const row = await prisma.brand.findFirst({ where: { id, organisationId }, include: { monitoringConfiguration: true, officialAssets: true } });
    return row ? fromDatabase(row) : undefined;
  }
  return (await read()).find(brand => brand.id === id && brand.organisationId === organisationId);
}

export async function createBrand(input: BrandInput): Promise<Brand> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const created = await prisma.brand.create({ data: databaseData(brandSchema.parse(input)), include: { monitoringConfiguration: true, officialAssets: true } });
    if (created.organisationId !== organisationId) throw new Error('Brand tenant mismatch after create.');
    return fromDatabase(created);
  }
  const now = new Date().toISOString();
  const brand: Brand = { ...brandSchema.parse(input), id: `brand_${randomUUID()}`, organisationId, createdAt: now, updatedAt: now };
  await write([...(await read()), brand]);
  return brand;
}

export async function updateBrand(id: string, input: BrandInput): Promise<Brand | undefined> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    return prisma.$transaction(async transaction => {
      const current = await transaction.brand.findFirst({ where: { id, organisationId } });
      if (!current) return undefined;
      const normalized = normalizedAssets(brandSchema.parse(input));
      await transaction.brandAlias.deleteMany({ where: { brandId: id } });
      await transaction.brandKeyword.deleteMany({ where: { brandId: id } });
      await transaction.officialDomain.deleteMany({ where: { brandId: id } });
      await transaction.officialSocialAccount.deleteMany({ where: { brandId: id } });
      await transaction.officialMobileApplication.deleteMany({ where: { brandId: id } });
      await transaction.officialAsset.deleteMany({ where: { brandId: id } });
      await transaction.monitoringConfiguration.deleteMany({ where: { brandId: id } });
      await transaction.brand.update({ where: { id }, data: {
        aliases: input.aliases as Prisma.InputJsonValue, description: input.description || null,
        logoUrl: input.logoUrl || null, industry: input.industry, subcategory: input.subcategory || null,
        websiteUrl: input.websiteUrl || null, domains: input.domains as Prisma.InputJsonValue,
        socialProfiles: input.socialProfiles as Prisma.InputJsonValue, keywords: input.keywords as Prisma.InputJsonValue,
        impersonationIndicators: input.impersonationIndicators as Prisma.InputJsonValue,
        mobileApplications: input.mobileApplications as Prisma.InputJsonValue,
        brandAliases: { create: normalized.brandAliases }, brandKeywords: { create: normalized.brandKeywords },
        officialDomains: { create: normalized.officialDomains }, officialSocialAccounts: { create: normalized.officialSocialAccounts },
        officialMobileApplications: { create: normalized.officialMobileApplications },
        monitoringConfiguration: { create: input.monitoringConfiguration },
        officialAssets: { create: [
          ...(input.logoUrl ? [{ type: 'LOGO', url: input.logoUrl, label: 'Configured brand logo' }] : []),
          ...input.officialAssets.map(asset => ({ type: asset.type, url: asset.url, label: asset.label || null, verified: asset.verified })),
        ] },
      } });
      const updated = await transaction.brand.findUniqueOrThrow({ where: { id }, include: { monitoringConfiguration: true, officialAssets: true } });
      return fromDatabase(updated);
    });
  }
  const all = await read();
  const index = all.findIndex(brand => brand.id === id && brand.organisationId === organisationId);
  if (index < 0) return undefined;
  const updated = { ...all[index], ...brandSchema.parse(input), updatedAt: new Date().toISOString() };
  all[index] = updated;
  await write(all);
  return updated;
}

export async function addOfficialAsset(brandId: string, input: unknown, organisationId: string) {
  const parsed = officialAssetSchema.parse(input);
  if (useDatabase) {
    const brand = await prisma.brand.findFirst({ where: { id: brandId, organisationId } });
    if (!brand) return undefined;
    return prisma.officialAsset.create({ data: { brandId, type: parsed.type, url: parsed.url, label: parsed.label || null, verified: parsed.verified } });
  }
  const all = await read();
  const index = all.findIndex(brand => brand.id === brandId);
  if (index < 0) return undefined;
  if (all[index].organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
  const asset = { ...parsed, id: `asset_${randomUUID()}`, brandId, createdAt: new Date().toISOString() };
  all[index] = { ...all[index], officialAssets: [...all[index].officialAssets, asset], updatedAt: new Date().toISOString() };
  await write(all);
  return asset;
}

export async function deleteBrand(id: string): Promise<'deleted' | 'not_found' | 'has_findings'> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const brand = await prisma.brand.findFirst({ where: { id, organisationId } });
    if (!brand) return 'not_found';
    if (await prisma.finding.count({ where: { brandId: id, organisationId } })) return 'has_findings';
    await prisma.brand.delete({ where: { id } });
    return 'deleted';
  }
  const all = await read();
  const next = all.filter(brand => brand.id !== id || brand.organisationId !== organisationId);
  if (next.length === all.length) return 'not_found';
  await write(next);
  return 'deleted';
}

/** Development-only JSON adapter. Production persistence must use the Prisma repository. */
