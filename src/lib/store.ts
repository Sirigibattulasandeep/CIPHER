import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { brandSchema, officialAssetSchema, type Brand, type BrandInput } from './contracts';

const file = path.join(process.cwd(),'data','brands.json');
const org = 'org_demo';
async function read():Promise<Brand[]> {
  try {
    const saved:unknown=JSON.parse(await fs.readFile(file,'utf8'));
    if(!Array.isArray(saved))throw new Error('INVALID_PERSISTED_DATA');
    const parsed=saved.map((value)=>{
      if(!value||typeof value!=='object')throw new Error('INVALID_PERSISTED_DATA');
      const record=value as Partial<Brand>;
      const input=brandSchema.safeParse(record);
      if(!input.success||typeof record.id!=='string'||typeof record.organisationId!=='string'||typeof record.createdAt!=='string'||typeof record.updatedAt!=='string')throw new Error('INVALID_PERSISTED_DATA');
      const officialAssets=Array.isArray(record.officialAssets)?record.officialAssets.map(asset=>({...asset,verified:false,verificationSource:'user-provided'})):[];
      return {...input.data,...record,officialAssets} as Brand;
    });
    return parsed;
  } catch(error) {
    if(error&&typeof error==='object'&&'code' in error&&(error as {code?:string}).code==='ENOENT') {
      await fs.mkdir(path.dirname(file),{recursive:true});
      const now=new Date().toISOString();
      const seed:Brand[]=[['brand_acme','Acme Learning','EDTECH','example.edu'],['brand_meridian','Meridian Pay','FINTECH','meridian.example'],['brand_luma','Luma Market','ECOMMERCE','luma.example']].map(([id,name,industry,domain])=>({id,organisationId:org,name,aliases:[],description:`Seeded demo brand: ${name}`,logoUrl:'',industry:industry as Brand['industry'],subcategory:'',websiteUrl:'',domains:[domain],socialProfiles:[],keywords:[name.toLowerCase()],impersonationIndicators:['support','login'],mobileApplications:[],officialAssets:[],monitoringConfiguration:{enabled:true,modules:['social','web','apps'],rules:[],frequency:'daily'},createdAt:now,updatedAt:now}));
      await write(seed);
      return seed;
    }
    if(error instanceof SyntaxError)throw new Error('INVALID_PERSISTED_DATA');
    throw error;
  }
}
async function write(brands:Brand[]) { const temporary=`${file}.${process.pid}.${randomUUID()}.tmp`; await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(temporary,JSON.stringify(brands,null,2),'utf8'); await fs.rename(temporary,file); }
const sameIdentity=(left:string,right:string)=>left.trim().toLocaleLowerCase()===right.trim().toLocaleLowerCase();
function sanitise(input:BrandInput):BrandInput{return {...input,officialAssets:input.officialAssets.map(asset=>({...asset,verified:false,verificationSource:asset.verificationSource||'user-provided'})),socialProfiles:input.socialProfiles.map(profile=>({...profile,status:profile.status==='ACTIVE'?'UNCONFIRMED':profile.status})),mobileApplications:input.mobileApplications.map(application=>({...application,status:application.status==='ACTIVE'?'UNCONFIRMED':application.status}))};}
function ensureUniqueBrand(all:Brand[],input:BrandInput,ignoreId?:string){const duplicate=all.find(brand=>brand.id!==ignoreId&&(sameIdentity(brand.name,input.name)||brand.aliases.some(alias=>sameIdentity(alias,input.name))||input.aliases.some(alias=>sameIdentity(alias,brand.name))));if(duplicate)throw new Error('DUPLICATE_BRAND');}
export async function listBrands(q='',organisationId=org){ const all=await read(); return all.filter(b=>b.organisationId===organisationId&&(!q||[b.name,...b.aliases,...b.domains].some(v=>v.toLowerCase().includes(q.toLowerCase())))); }
export async function queryBrands(options:{q?:string;industry?:string;monitoring?:string;sort?:'name'|'updatedAt';direction?:'asc'|'desc';page?:number;pageSize?:number},organisationId=org){ let items=await listBrands(options.q,organisationId); if(options.industry)items=items.filter(item=>item.industry===options.industry); if(options.monitoring)items=items.filter(item=>String(item.monitoringConfiguration.enabled)===options.monitoring); const direction=options.direction==='desc'?-1:1; items.sort((a,b)=>String(a[options.sort||'name']).localeCompare(String(b[options.sort||'name']))*direction); const page=Math.max(1,options.page||1),pageSize=Math.min(100,Math.max(1,options.pageSize||20)),total=items.length; return {items:items.slice((page-1)*pageSize,page*pageSize),total,page,pageSize,totalPages:Math.max(1,Math.ceil(total/pageSize))}; }
export async function getBrand(id:string,organisationId=org){ return (await read()).find(b=>b.id===id&&b.organisationId===organisationId); }
export async function createBrand(input:BrandInput,organisationId=org){ const all=await read(); const clean=sanitise(input); ensureUniqueBrand(all.filter(brand=>brand.organisationId===organisationId),clean); const now=new Date().toISOString(); const brand={...clean,id:`brand_${randomUUID()}`,organisationId,createdAt:now,updatedAt:now}; await write([...all,brand]); return brand; }
export async function addOfficialAsset(brandId:string,input:unknown,organisationId:string){const all=await read();const index=all.findIndex(brand=>brand.id===brandId);if(index<0)return; if(all[index].organisationId!==organisationId)throw new Error('FORBIDDEN_ORGANISATION');const asset={...officialAssetSchema.parse(input),verified:false,verificationSource:"user-provided",id:`asset_${randomUUID()}`,brandId,createdAt:new Date().toISOString()};all[index].officialAssets.push(asset);all[index].updatedAt=new Date().toISOString();await write(all);return asset;}
export async function updateBrand(id:string,input:BrandInput,organisationId=org){ const all=await read(); const index=all.findIndex(b=>b.id===id&&b.organisationId===organisationId); if(index<0)return; const clean=sanitise(input); ensureUniqueBrand(all.filter(brand=>brand.organisationId===organisationId),clean,id); const brand={...all[index],...clean,officialAssets:all[index].officialAssets,organisationId,updatedAt:new Date().toISOString()}; all[index]=brand; await write(all); return brand; }
export async function deleteBrand(id:string,organisationId=org){ const all=await read(); const target=all.find(brand=>brand.id===id&&brand.organisationId===organisationId); if(!target)return false; const next=all.filter(b=>b.id!==id); let findings:Array<{brandId:string;organisationId?:string}>=[]; try { const saved:unknown=JSON.parse(await fs.readFile(path.join(path.dirname(file),'findings.json'),'utf8')); if(!Array.isArray(saved))throw new Error('INVALID_PERSISTED_DATA'); findings=saved as Array<{brandId:string;organisationId?:string}>; } catch(error) { if(error&&typeof error==='object'&&'code' in error&&(error as {code?:string}).code==='ENOENT')findings=[]; else if(error instanceof SyntaxError)throw new Error('INVALID_PERSISTED_DATA'); else throw error; } if(findings.some(finding=>finding.brandId===id&&(!finding.organisationId||finding.organisationId===organisationId)))throw new Error('BRAND_HAS_RELATIONSHIPS'); await write(next); return true; }
