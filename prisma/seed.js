const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const organisation = await prisma.organisation.upsert({ where: { id: 'org_demo' }, update: {}, create: { id: 'org_demo', name: 'CIPHER Demo' } });
  await prisma.brand.upsert({ where: { id: 'brand_acme' }, update: {}, create: { id: 'brand_acme', organisationId: organisation.id, name: 'Acme Learning', aliases: ['Acme'], description: 'Seeded demo brand', industry: 'EDTECH', domains: ['example.com'], socialProfiles: [], keywords: ['acme'], impersonationIndicators: [], mobileApplications: [] } });
}
main().finally(() => prisma.$disconnect());
