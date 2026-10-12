import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Brand } from '../src/lib/contracts';
import { analyzeAppCandidate, analyzeSocialCandidate, scanRecords, type AppCandidate, type SocialCandidate } from '../src/lib/social-monitoring';
import { resolveImportedProvenance } from '../src/lib/import-provenance';

const brand: Brand = {
  id: 'brand_northstar', organisationId: 'org_test', name: 'Northstar', aliases: ['North Star'],
  description: '', logoUrl: 'https://northstar.example/logo.png', industry: 'FINTECH', subcategory: '',
  websiteUrl: 'https://northstar.example', domains: ['northstar.example'],
  socialProfiles: [{ platform: 'LinkedIn', profileUrl: 'https://www.linkedin.com/company/northstar', handle: 'northstar', profileId: 'northstar', verificationSource: 'test fixture', status: 'ACTIVE' }], keywords: [], impersonationIndicators: [],
  mobileApplications: [{ name: 'Northstar Banking', platform: 'ANDROID', storeUrl: 'https://play.google.com/store/apps/details?id=com.northstar.bank', publisher: 'Northstar Labs', packageId: 'com.northstar.bank', verificationSource: 'test fixture', status: 'ACTIVE' }],
  officialAssets: [],
  monitoringConfiguration: { enabled: true, modules: ['social', 'apps'], rules: [], frequency: 'daily' },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('social monitoring', () => {
  it('never trusts client records to claim a connected source or inflate reliability', () => {
    expect(resolveImportedProvenance('CONNECTED')).toEqual({ origin: 'IMPORTED', sourceReliability: 0.75 });
    expect(resolveImportedProvenance('IMPORTED')).toEqual({ origin: 'IMPORTED', sourceReliability: 0.75 });
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
});
