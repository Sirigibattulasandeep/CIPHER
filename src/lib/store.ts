import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Brand, BrandInput } from './contracts';

const file = path.join(process.cwd(),'data','brands.json');
const org = 'org_demo';
async function read():Promise<Brand[]> { try { return JSON.parse(await fs.readFile(file,'utf8')); } catch { await fs.mkdir(path.dirname(file),{recursive:true}); const seed:Brand[]=[{id:'brand_acme',organisationId:org,name:'Acme Learning',aliases:['Acme'],description:'A seeded example organisation brand.',logoUrl:'',industry:'EDTECH',subcategory:'Online learning',websiteUrl:'https://example.com',domains:['example.com'],socialProfiles:[],keywords:['acme','learning'],impersonationIndicators:['support','login'],mobileApplications:[],monitoringConfiguration:{enabled:true,modules:['social','web','apps'],rules:[],frequency:'daily'},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]; await write(seed); return seed; } }
async function write(brands:Brand[]) { await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file,JSON.stringify(brands,null,2)); }
export async function listBrands(q=''){ const all=await read(); return all.filter(b=>!q||[b.name,...b.aliases,...b.domains].some(v=>v.toLowerCase().includes(q.toLowerCase()))); }
export async function getBrand(id:string){ return (await read()).find(b=>b.id===id); }
export async function createBrand(input:BrandInput){ const now=new Date().toISOString(); const brand={...input,id:`brand_${randomUUID()}`,organisationId:org,createdAt:now,updatedAt:now}; const all=await read(); await write([...all,brand]); return brand; }
export async function updateBrand(id:string,input:BrandInput){ const all=await read(); const index=all.findIndex(b=>b.id===id); if(index<0)return; const brand={...all[index],...input,updatedAt:new Date().toISOString()}; all[index]=brand; await write(all); return brand; }
export async function deleteBrand(id:string){ const all=await read(); const next=all.filter(b=>b.id!==id); if(next.length===all.length)return false; await write(next); return true; }
