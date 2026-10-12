const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const organisation = await prisma.organisation.upsert({ where: { id: 'org_demo' }, update: {}, create: { id: 'org_demo', name: 'CIPHER Demo' } });
  const brands = [
    ['brand_acme','Acme Learning','EDTECH','acme-learning.example.com'],
    ['brand_meridian','Meridian Pay','FINTECH','meridian-pay.example.com'],
    ['brand_luma','Luma Market','ECOMMERCE','luma-market.example.com']
  ];
  for (const [id,name,industry,domain] of brands) await prisma.brand.upsert({ where: { id }, update: {}, create: { id, organisationId: organisation.id, name, aliases: [], description: `Seeded demo brand: ${name}`, industry, domains: [domain], socialProfiles: [], keywords: [name.toLowerCase()], impersonationIndicators: ['support','login'], mobileApplications: [] } });
}
main().finally(() => prisma.$disconnect());
