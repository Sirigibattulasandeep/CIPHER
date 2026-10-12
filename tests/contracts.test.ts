import { describe, expect, it } from 'vitest';
import { brandSchema, findingSchema } from '../src/lib/contracts';
import { isOfficialHostname, matchBrandName, matchOfficialDomain } from '../src/lib/brand-dna';

describe('shared contracts', () => {
  it('accepts a minimal valid brand and applies monitoring defaults', () => {
    const brand = brandSchema.parse({ name: 'Northstar', industry: 'FINTECH' });
    expect(brand.monitoringConfiguration.enabled).toBe(true);
    expect(brand.monitoringConfiguration.modules).toContain('social');
  });

  it('rejects invalid brand URLs and short names', () => {
    const result = brandSchema.safeParse({ name: 'x', industry: 'FINTECH', websiteUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('keeps finding sources bounded to shared detection modules', () => {
    const base = { id:'f1', organisationId:'o1', brandId:'b1', category:'impersonation', affectedEntity:'example.com', title:'Lookalike domain', description:'', evidence:[], detectionIndicators:[], riskScore:80, severity:'HIGH', confidence:90, status:'NEW', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    expect(findingSchema.safeParse({...base, source:'DOMAIN'}).success).toBe(true);
    expect(findingSchema.safeParse({...base, source:'UNKNOWN'}).success).toBe(false);
  });
  it('matches Brand DNA without confusing attacker-controlled hostnames', () => {
    expect(isOfficialHostname('login.example.com','example.com')).toBe(true);
    expect(isOfficialHostname('example.com.attacker.test','example.com')).toBe(false);
    expect(matchOfficialDomain('https://shop.example.com/path',['example.com'])?.matchType).toBe('DOMAIN');
    expect(matchBrandName('  ACME  ','Acme',['Acme Learning'])?.matchType).toBe('NAME');
    expect(matchBrandName('acme-support','Acme',['Acme Learning'])).toBeNull();
  });
});
