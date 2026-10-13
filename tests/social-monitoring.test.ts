import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Brand, Finding } from '../src/lib/contracts';
import { analyzeAppCandidate, analyzeSocialCandidate, scanRecords, type AppCandidate, type SocialCandidate } from '../src/lib/social-monitoring';
import { assessRisk } from '../src/lib/risk-scoring';
import { analyzeDomainCandidate } from '../src/lib/domain-monitoring';
import { aggregateExposure, severityCounts } from '../src/lib/dashboard-metrics';
import { resolveImportedProvenance } from '../src/lib/import-provenance';

const brand: Brand = {
  id: 'brand_northstar', organisationId: 'org_test', name: 'Northstar', aliases: ['North Star'],
  description: '', logoUrl: 'https://northstar.example/logo.png', industry: 'FINTECH', subcategory: '',
  websiteUrl: 'https://northstar.example', domains: ['northstar.example'],
  socialProfiles: [{ platform: 'LinkedIn', profileUrl: 'https://www.linkedin.com/company/northstar', handle: 'northstar', profileId: 'northstar', verificationSource: 'test fixture', status: 'ACTIVE' }], keywords: [], impersonationIndicators: [],
  mobileApplications: [{ name: 'Northstar Banking', platform: 'ANDROID', storeUrl: 'https://play.google.com/store/apps/details?id=com.northstar.bank', publisher: 'Northstar Labs', packageId: 'com.northstar.bank', verificationSource: 'test fixture', status: 'ACTIVE' }], officialAssets: [],
  monitoringConfiguration: { enabled: true, modules: ['social', 'apps'], rules: [], frequency: 'daily' },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('social monitoring', () => {
  it('does not accept a client claim of a connected source', () => {
    expect(resolveImportedProvenance('CONNECTED')).toEqual({ origin: 'IMPORTED', sourceReliability: 0.75 });
    expect(resolveImportedProvenance('DEMO')).toEqual({ origin: 'DEMO', sourceReliability: 0.6 });
  });

  it('excludes the configured official social profile from identity alerts', () => {
    const candidate: SocialCandidate = { platform: 'LinkedIn', handle: 'northstar', displayName: 'Northstar', profileUrl: 'https://www.linkedin.com/company/northstar', origin: 'IMPORTED' };
    expect(analyzeSocialCandidate(brand, candidate, '2026-10-12T00:00:00.000Z')).toBeNull();
  });

  it('keeps a benign fan profile low risk', () => {
    const candidate: SocialCandidate = { platform: 'X', handle: 'northstar_fan_club', displayName: 'Northstar Fan Club', bio: 'An unofficial community for fans.', origin: 'IMPORTED' };
    expect(analyzeSocialCandidate(brand, candidate, '2026-10-12T00:00:00.000Z')).toBeNull();
  });

  it('combines scam text, a lookalike domain, and logo evidence', () => {
    const candidate: SocialCandidate = {
      platform: 'Instagram', handle: 'northstarr_support', displayName: 'Northstar Official Support',
      bio: 'Claim your prize by paying a processing fee.', links: ['https://northstarr.example/login'],
      profileUrl: 'https://www.instagram.com/northstarr_support', avatarSimilarity: 0.94, origin: 'DEMO',
    };
    const finding = analyzeSocialCandidate(brand, candidate, '2026-10-12T00:00:00.000Z');
    expect(finding).not.toBeNull();
    if (!finding) return;
    expect(finding.riskScore).toBeGreaterThanOrEqual(70);
    expect(['HIGH', 'CRITICAL']).toContain(finding.severity);
    expect(finding.detectionIndicators).toContain('brand_domain_lookalike');
    expect(finding.detectionIndicators).toContain('payment_request');
    expect(finding.evidence[0]).toBe('Record origin: DEMO');
  });

  it('treats common Unicode confusables as a risk signal, not an official-account match', () => {
    const homographBrand = { ...brand, socialProfiles: [{ platform: 'X', profileUrl: 'https://x.com/northstar', handle: 'northstar', profileId: '', verificationSource: 'test fixture', status: 'ACTIVE' as const }] };
    const candidate: SocialCandidate = { platform: 'X', handle: 'nоrthstar', displayName: 'Northstar Support', bio: 'Official Northstar customer support.' };
    const finding = analyzeSocialCandidate(homographBrand, candidate, '2026-10-12T00:00:00.000Z');
    expect(finding).not.toBeNull();
    expect(finding?.detectionIndicators).toContain('handle_similarity');
    expect(finding?.detectionIndicators).toContain('support_language');
  });
});

describe('app store monitoring', () => {
  it('excludes the exact configured official package ID', () => {
    const official: AppCandidate = { store: 'Google Play', appId: 'com.northstar.bank', name: 'Northstar Banking', publisher: 'Northstar Labs', origin: 'IMPORTED' };
    expect(analyzeAppCandidate(brand, official, '2026-10-12T00:00:00.000Z')).toBeNull();
  });

  it('detects transposed names and publisher differences as corroborating evidence', () => {
    const candidate: AppCandidate = {
      store: 'Google Play', appId: 'com.bad.northstar', name: 'Northstar Bankign Support',
      publisher: 'Unknown Studio', description: 'Official Northstar support. Claim your prize by paying a processing fee.',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.bad.northstar',
      links: ['https://northstarr.example/login'], logoSimilarity: 0.92, origin: 'IMPORTED',
    };
    const finding = analyzeAppCandidate(brand, candidate, '2026-10-12T00:00:00.000Z');
    expect(finding).not.toBeNull();
    expect(finding?.detectionIndicators).toContain('app_name_similarity');
    expect(finding?.detectionIndicators).toContain('publisher_mismatch');
    expect(finding?.detectionIndicators).toContain('brand_domain_lookalike');
    expect(['HIGH', 'CRITICAL']).toContain(finding?.severity);
    expect(finding?.source).toBe('MOBILE_APP');
  });

  it('keeps dissimilar app listings low risk and preserves the brand association', () => {
    const candidate: AppCandidate = { store: 'Google Play', appId: 'com.sky.stars', name: 'Stargazer Sky Guide', publisher: 'Open Sky', description: 'Explore constellations.', origin: 'DEMO' };
    const [finding] = scanRecords(brand, 'apps', [candidate], '2026-10-12T00:00:00.000Z');
    expect(finding.brandId).toBe(brand.id);
    expect(finding.severity).toBe('LOW');
    expect(finding.source).toBe('MOBILE_APP');
  });
});

describe('shared risk scoring', () => {
  it.each([
    [0, 'LOW'], [34, 'LOW'], [35, 'MODERATE'], [64, 'MODERATE'],
    [65, 'HIGH'], [84, 'HIGH'], [85, 'CRITICAL'], [100, 'CRITICAL'],
  ] as const)('maps score %i to %s', (score, severity) => {
    const assessment = assessRisk([{ category: 'identity', indicator: 'test', score, summary: 'test signal', detail: '' }]);
    expect(assessment.severity).toBe(severity);
  });

  it('takes the strongest contribution per category and caps at 100', () => {
    const assessment = assessRisk([
      { category: 'identity', indicator: 'name', score: 24, summary: 'Name match', detail: '' },
      { category: 'identity', indicator: 'handle', score: 18, summary: 'Handle match', detail: '' },
      { category: 'content', indicator: 'scam', score: 90, summary: 'Scam phrase', detail: '' },
    ]);
    expect(assessment.score).toBe(100);
    expect(assessment.breakdown).toHaveLength(2);
    expect(assessment.breakdown[0].indicator).toBe('name');
    expect(assessment.scoringVersion).toBe('sentrix-risk-v1');
  });
});

describe('domain and website analysis', () => {
  it('excludes official domains and their subdomains', () => {
    expect(analyzeDomainCandidate(brand, { url: 'https://login.northstar.example/account' })).toBeNull();
  });

  it('detects a lookalike domain with corroborating brand page indicators without fetching it', () => {
    const finding = analyzeDomainCandidate(brand, {
      url: 'https://northstarr-support.example/login', title: 'Northstar Official Support',
      description: 'Sign in to claim your reward.', origin: 'IMPORTED',
    });
    expect(finding?.source).toBe('DOMAIN');
    expect(finding?.detectionIndicators).toContain('lookalike_domain');
    expect(finding?.detectionIndicators).toContain('credential_or_claim_path');
    expect(finding?.evidence).toContain('Record origin: IMPORTED');
  });

  it('detects a Unicode homoglyph in a submitted domain', () => {
    const finding = analyzeDomainCandidate(brand, { url: 'https://nоrthstar-bank.example/login' });
    expect(finding?.detectionIndicators).toContain('homoglyph_domain');
  });

  it('does not return unrelated, harmless domains', () => {
    expect(analyzeDomainCandidate(brand, { url: 'https://stargazer.example', title: 'Astronomy guide' })).toBeNull();
  });

  it('rejects malformed and non-web protocols without making a request', () => {
    expect(analyzeDomainCandidate(brand, { url: 'javascript:alert(1)' })).toBeNull();
    expect(analyzeDomainCandidate(brand, { url: 'https://user:pass@northstarr.example' })).toBeNull();
  });
});

describe('dashboard risk aggregation', () => {
  const makeFinding = (id: string, source: Finding['source'], riskScore: number, status: Finding['status'] = 'NEW'): Finding => ({
    id, organisationId: 'org_demo', brandId: 'brand_northstar', source, category: 'test', affectedEntity: id,
    title: id, description: '', evidence: [], detectionIndicators: [], riskScore,
    severity: riskScore >= 85 ? 'CRITICAL' : riskScore >= 65 ? 'HIGH' : riskScore >= 35 ? 'MODERATE' : 'LOW', confidence: 60, status,
    createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
  });

  it('does not inflate the exposure index with repeat findings from the same channel', () => {
    expect(aggregateExposure([
      makeFinding('social-a', 'SOCIAL', 70), makeFinding('social-b', 'SOCIAL', 62),
      makeFinding('app-a', 'MOBILE_APP', 45),
    ])).toBe(75);
  });

  it('returns zero with no active findings and reports stored severity counts', () => {
    const findings = [makeFinding('low', 'DOMAIN', 20), makeFinding('closed', 'SOCIAL', 85, 'RESOLVED')];
    expect(aggregateExposure(findings)).toBe(20);
    expect(aggregateExposure([])).toBe(0);
    expect(severityCounts(findings)).toEqual({ CRITICAL: 1, HIGH: 0, MODERATE: 0, LOW: 1 });
  });
});

describe('shared findings persistence', () => {
  let dataDirectory: string;
  beforeEach(async () => {
    dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'sentrix-findings-test-'));
    vi.stubEnv('SENTRIX_DATA_DIR', dataDirectory);
    vi.resetModules();
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await rm(dataDirectory, { recursive: true, force: true });
  });

  it('persists findings and status updates through the shared Finding store', async () => {
    const store = await import('../src/lib/findings-store');
    const input = {
      id: 'finding_test', organisationId: 'untrusted-client-org', brandId: 'brand_northstar',
      category: 'POTENTIAL_SOCIAL_IMPERSONATION', source: 'SOCIAL' as const,
      affectedEntity: 'X @northstar_help', title: 'Potential social impersonation', description: 'Review multiple signals.',
      evidence: ['Record origin: IMPORTED', 'Lookalike name with source URL'],
      detectionIndicators: ['handle_similarity', 'Record origin: IMPORTED'],
      riskScore: 74, severity: 'HIGH' as const, confidence: 68, status: 'NEW' as const,
      createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
    };
    const [created] = await store.createFindings([input]);
    expect(created.organisationId).toBe('org_demo');
    expect((await store.listFindings({ brandId: 'brand_northstar' })).map(item => item.id)).toContain('finding_test');

    await store.updateFindingStatus(created.id, 'INVESTIGATING');
    vi.resetModules();
    const reopened = await import('../src/lib/findings-store');
    expect((await reopened.listFindings())[0].status).toBe('INVESTIGATING');
  });

  it('deduplicates repeat scans and preserves investigation status', async () => {
    const store = await import('../src/lib/findings-store');
    const input = {
      id: 'finding_dedupe_1', organisationId: 'org_demo', brandId: 'brand_northstar',
      category: 'POTENTIAL_SOCIAL_IMPERSONATION', source: 'SOCIAL' as const,
      affectedEntity: 'X @northstar_support', title: 'Potential impersonation', description: 'Review the signals.',
      evidence: ['Record origin: IMPORTED'], detectionIndicators: ['handle_similarity'], riskScore: 52,
      severity: 'MODERATE' as const, confidence: 70, status: 'NEW' as const,
      createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
    };
    const [created] = await store.createFindings([input]);
    await store.updateFindingStatus(created.id, 'INVESTIGATING');
    const [updated] = await store.createFindings([{ ...input, id: 'new-random-scan-id', riskScore: 64, severity: 'MODERATE' }]);
    expect(updated.id).toBe(created.id);
    expect(updated.status).toBe('INVESTIGATING');
    expect(updated.riskScore).toBe(64);
    expect((await store.listFindings({ brandId: 'brand_northstar' })).length).toBe(1);
  });

  it('creates an investigation and persists analyst notes', async () => {
    const findingsStore = await import('../src/lib/findings-store');
    await findingsStore.createFindings([{
      id: 'finding_for_investigation', organisationId: 'org_demo', brandId: 'brand_northstar',
      category: 'POTENTIAL_SOCIAL_IMPERSONATION', source: 'SOCIAL', affectedEntity: 'X @northstar_help',
      title: 'Potential impersonation', description: 'Review the supplied evidence.', evidence: ['Record origin: IMPORTED'],
      detectionIndicators: ['support_language'], riskScore: 42, severity: 'MODERATE', confidence: 72, status: 'NEW',
      createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
    }]);
    const store = await import('../src/lib/investigations-store');
    const created = await store.createInvestigation('finding_for_investigation');
    expect(created?.status).toBe('OPEN');
    const updated = await store.addInvestigationNote(created!.id, 'Preserve the profile URL and verify official support contacts.');
    expect(updated?.notes).toHaveLength(1);
    await store.updateInvestigationStatus(created!.id, 'IN_PROGRESS');
    vi.resetModules();
    const reopened = await import('../src/lib/investigations-store');
    const persisted = (await reopened.listInvestigations())[0];
    expect(persisted.notes[0].body).toContain('Preserve the profile URL');
    expect(persisted.status).toBe('IN_PROGRESS');
  });

  it('seeds three demo brands from distinct industries without replacing existing data', async () => {
    const store = await import('../src/lib/store');
    const brands = await store.listBrands();
    expect(brands.map(item => item.industry)).toEqual(expect.arrayContaining(['EDTECH', 'FINTECH', 'ECOMMERCE']));
    await store.createBrand({
      name: 'Test Brand', aliases: [], description: '', logoUrl: '', industry: 'TECHNOLOGY_SAAS', subcategory: '',
      websiteUrl: '', domains: [], socialProfiles: [], keywords: [], impersonationIndicators: [], mobileApplications: [], officialAssets: [],
      monitoringConfiguration: { enabled: true, modules: ['social'], rules: [], frequency: 'daily' },
    });
    expect((await store.listBrands()).length).toBe(4);
  });
});
