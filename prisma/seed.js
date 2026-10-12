import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const organisationId = 'org_demo';
const now = new Date();

const brands = [
  {
    id: 'brand_kampusvc', name: 'Kampus.VC', aliases: ['Kampus VC'], industry: 'EDTECH',
    description: 'Demo brand profile based on the company named in the challenge brief.',
    websiteUrl: 'https://kampus.vc', domains: ['kampus.vc'], socialProfiles: [], keywords: ['Kampus', 'venture studio'],
    impersonationIndicators: ['official', 'support'], mobileApplications: [],
  },
  {
    id: 'brand_northstar', name: 'Northstar Bank', aliases: ['Northstar'], industry: 'FINTECH',
    description: 'Fictional fintech brand for SENTRIX demo data.', websiteUrl: 'https://northstar-bank.example',
    domains: ['northstar-bank.example'], socialProfiles: ['https://x.com/northstarbank'], keywords: ['banking', 'account'],
    impersonationIndicators: ['support', 'login'],
    mobileApplications: [{ name: 'Northstar Mobile Banking', storeUrl: '', publisher: 'Northstar Demo Bank', packageId: 'example.northstar.mobile' }],
  },
  {
    id: 'brand_cedarfinch', name: 'Cedar & Finch', aliases: ['Cedar Finch'], industry: 'ECOMMERCE',
    description: 'Fictional e-commerce brand for SENTRIX demo data.', websiteUrl: 'https://cedarfinch.example',
    domains: ['cedarfinch.example'], socialProfiles: ['https://www.instagram.com/cedarfinch'], keywords: ['shop', 'orders'],
    impersonationIndicators: ['support', 'offers'],
    mobileApplications: [{ name: 'Cedar & Finch Shop', storeUrl: '', publisher: 'Cedar Finch Demo', packageId: 'example.cedarfinch.shop' }],
  },
];

async function main() {
  await prisma.organisation.upsert({ where: { id: organisationId }, update: {}, create: { id: organisationId, name: 'CIPHER Demo' } });
  for (const input of brands) {
    const brand = await prisma.brand.upsert({
      where: { id: input.id },
      update: { ...input, updatedAt: now },
      create: {
        ...input, organisationId, logoUrl: '', subcategory: '',
        monitoringConfiguration: { create: { enabled: true, modules: ['social', 'web', 'apps'], rules: [], frequency: 'daily' } },
      },
    });
    const socialAccounts = input.socialProfiles.map(profileUrl => {
      const url = new URL(profileUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      return { brandId: brand.id, profileUrl, platform: url.hostname.toLowerCase().replace(/^www\./, ''), handle: (parts.at(-1) || '').replace(/^@/, '') };
    }).filter(value => value.handle);
    await prisma.$transaction(async tx => {
      await tx.brandAlias.deleteMany({ where: { brandId: brand.id } });
      await tx.brandKeyword.deleteMany({ where: { brandId: brand.id } });
      await tx.officialDomain.deleteMany({ where: { brandId: brand.id } });
      await tx.officialSocialAccount.deleteMany({ where: { brandId: brand.id } });
      await tx.officialMobileApplication.deleteMany({ where: { brandId: brand.id } });
      await tx.brandAlias.createMany({ data: input.aliases.map(value => ({ brandId: brand.id, value, normalized: value.toLowerCase().replace(/[^a-z0-9]/g, '') })).filter(value => value.normalized), skipDuplicates: true });
      await tx.brandKeyword.createMany({ data: input.keywords.map(value => ({ brandId: brand.id, value, normalized: value.toLowerCase().replace(/[^a-z0-9]/g, '') })).filter(value => value.normalized), skipDuplicates: true });
      await tx.officialDomain.createMany({ data: input.domains.map(domain => ({ brandId: brand.id, domain: domain.toLowerCase() })), skipDuplicates: true });
      await tx.officialSocialAccount.createMany({ data: socialAccounts, skipDuplicates: true });
      await tx.officialMobileApplication.createMany({ data: input.mobileApplications.filter(app => app.packageId).map(app => ({ brandId: brand.id, name: app.name, packageId: app.packageId, storeUrl: app.storeUrl || null, publisher: app.publisher || null })), skipDuplicates: true });
    });
  }

  const findingSeeds = [
    {
      id: 'demo_finding_northstar_social', brandId: 'brand_northstar', source: 'SOCIAL',
      category: 'POTENTIAL_SOCIAL_IMPERSONATION', affectedEntity: 'X @northstarbank_support',
      title: 'Simulated social account for analyst review', description: 'Demo-only evidence combines a lookalike handle with a support claim.',
      sourceUrl: 'https://social.example/northstarbank_support', evidence: ['Record origin: DEMO', 'Simulated handle resemblance', 'Simulated support wording'],
      detectionIndicators: ['handle_similarity', 'support_language', 'Record origin: DEMO'], riskScore: 67,
      riskScoreBreakdown: [
        { category: 'identity', indicator: 'handle_similarity', contribution: 32, reason: 'Username resembles a configured account.' },
        { category: 'affiliation', indicator: 'support_language', contribution: 20, reason: 'Support wording appears in the profile.' },
        { category: 'links', indicator: 'unlisted_domain', contribution: 15, reason: 'The URL is not configured as official.' },
      ], scoringVersion: 'sentrix-risk-v1', severity: 'HIGH', confidence: 60, status: 'NEW',
    },
    {
      id: 'demo_finding_cedar_false_positive', brandId: 'brand_cedarfinch', source: 'SOCIAL',
      category: 'POTENTIAL_SOCIAL_IMPERSONATION', affectedEntity: 'Instagram @cedarfinch_fanclub',
      title: 'Simulated fan account marked false positive', description: 'A harmless community example demonstrates review and false-positive handling.',
      sourceUrl: 'https://social.example/cedarfinch_fanclub', evidence: ['Record origin: DEMO', 'The account describes itself as an unofficial fan community.'],
      detectionIndicators: ['brand_name_reference', 'Record origin: DEMO'], riskScore: 12,
      riskScoreBreakdown: [{ category: 'identity', indicator: 'brand_name_reference', contribution: 12, reason: 'The brand name appears in the username.' }],
      scoringVersion: 'sentrix-risk-v1', severity: 'LOW', confidence: 45, status: 'FALSE_POSITIVE',
    },
    {
      id: 'demo_finding_kampus_domain', brandId: 'brand_kampusvc', source: 'DOMAIN',
      category: 'POTENTIAL_LOOKALIKE_DOMAIN', affectedEntity: 'kampus-vc-login.example',
      title: 'Simulated lookalike domain for analyst review', description: 'This synthetic URL is provided only to demonstrate domain analysis and does not represent a verified threat.',
      sourceUrl: 'https://kampus-vc-login.example/login', evidence: ['Record origin: DEMO', 'Synthetic domain contains the brand name and login language.'],
      detectionIndicators: ['brand_name_in_domain', 'credential_or_claim_path', 'brand_affiliation_or_offer', 'Record origin: DEMO'], riskScore: 46,
      riskScoreBreakdown: [
        { category: 'domain_identity', indicator: 'brand_name_in_domain', contribution: 14, reason: 'The submitted domain contains a configured brand name.' },
        { category: 'url_behavior', indicator: 'credential_or_claim_path', contribution: 14, reason: 'The URL path uses login language.' },
        { category: 'page_content', indicator: 'brand_affiliation_or_offer', contribution: 18, reason: 'Submitted metadata claims affiliation.' },
      ], scoringVersion: 'sentrix-risk-v1', severity: 'MODERATE', confidence: 52, status: 'NEW',
    },
  ];
  for (const value of findingSeeds) {
    const { riskScoreBreakdown, ...finding } = value;
    const entityKey = value.affectedEntity.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    await prisma.finding.upsert({
      where: { id: value.id },
      update: { ...finding, entityKey, riskScoreBreakdown, updatedAt: now },
      create: { ...finding, entityKey, riskScoreBreakdown, organisationId, createdAt: now, updatedAt: now },
    });
  }
  console.log(`Seeded ${brands.length} demo brands and ${findingSeeds.length} clearly labeled simulated findings.`);
}

main().catch(error => { console.error('Demo seed failed:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
