import { describe, expect, it } from 'vitest';
import { assertOrganisationRequest } from '../src/lib/auth';
import { createFinding, addEvidence, changeFindingStatus, getFinding, listFindings } from '../src/lib/finding-store';
import { addOfficialAsset, createBrand, getBrand } from '../src/lib/store';
import { brandSchema } from '../src/lib/contracts';
import { GET as getFindings } from '../src/app/api/findings/route';

describe('tenant isolation and finding vertical slice', () => {
  it('denies cross-organisation reads and writes at the server boundary', () => {
    const request = new Request('http://localhost/api/brands', { headers: { 'x-organisation-id': 'org_other' } });
    expect(() => assertOrganisationRequest(request)).toThrow('FORBIDDEN_ORGANISATION');
  });

  it('rejects malformed finding pagination and keeps list responses tenant-scoped', async () => {
    const invalid = await getFindings(new Request('http://localhost/api/findings?page=abc'));
    expect(invalid.status).toBe(400);
    const forbidden = await getFindings(new Request('http://localhost/api/findings', { headers: { 'x-organisation-id': 'org_other' } }));
    expect(forbidden.status).toBe(403);
    const bounded = await getFindings(new Request('http://localhost/api/findings?page=1&pageSize=999999'));
    expect(bounded.status).toBe(200);
    const body = await bounded.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(100);
    expect(body.items.every((item:{organisationId:string})=>item.organisationId==='org_demo')).toBe(true);
  });

  it('persists a finding, evidence, status history and official-identity relationship', async () => {
    const brand = await createBrand(brandSchema.parse({ name:`Integration ${Date.now()}`, industry:'EDTECH', domains:['example.test'] }));
    const asset = await addOfficialAsset(brand.id, { type:'WEBSITE', url:'https://example.test', label:'Official website', verified:true, verificationSource:'integration-test' }, 'org_demo');
    const persistedBrand = await getBrand(brand.id);
    const brandId = brand.id;
    const finding = await createFinding({ organisationId:'org_demo', brandId, category:'lookalike-domain', source:'DOMAIN', affectedEntity:'login.example.test', title:'Lookalike domain', description:'Demo integration record', evidence:[], detectionIndicators:['hostname similarity'], riskScore:72, severity:'HIGH', confidence:81 }, 'org_demo');
    await addEvidence(finding.id, { kind:'URL', value:'https://login.example.test', provenance:'demo-seed' }, 'org_demo');
    const updated = await changeFindingStatus(finding.id, 'INVESTIGATING', 'org_demo');
    const reloaded = await getFinding(finding.id, 'org_demo');
    expect(asset?.brandId).toBe(brandId);
    expect(asset?.verified).toBe(false);
    expect(persistedBrand?.officialAssets).toHaveLength(1);
    expect(updated?.status).toBe('INVESTIGATING');
    expect(reloaded?.brandId).toBe(brandId);
    expect(reloaded?.evidenceRecords).toHaveLength(1);
    expect(reloaded?.statusHistory.map(item=>item.status)).toEqual(['NEW','INVESTIGATING']);
    const listed = await listFindings('org_demo', { brandId, status:'INVESTIGATING', page:1, pageSize:10 });
    expect(listed.items.some(item=>item.id===finding.id)).toBe(true);
    await expect(getFinding(finding.id, 'org_other')).rejects.toThrow('FORBIDDEN_ORGANISATION');
    await expect(addEvidence(finding.id, { kind:'URL', value:'https://attacker.test' }, 'org_other')).rejects.toThrow('FORBIDDEN_ORGANISATION');
  });
});
