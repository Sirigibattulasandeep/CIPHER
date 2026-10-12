import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { findingInputSchema, evidenceInputSchema, type Finding } from './contracts';

export type EvidenceRecord = { id:string; findingId:string; kind:string; value:string; sourceUrl?:string; provenance:string; integrityHash?:string; capturedAt:string };
export type FindingRecord = Finding & { evidenceRecords:EvidenceRecord[]; statusHistory:Array<{status:Finding['status'];changedAt:string;changedBy:string}> };
const file=path.join(process.cwd(),'data','findings.json');
async function read():Promise<FindingRecord[]>{try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return [];}}
async function write(items:FindingRecord[]){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(items,null,2));}
export async function createFinding(input:unknown, organisationId:string){const parsed=findingInputSchema.parse(input);if(parsed.organisationId!==organisationId)throw new Error('FORBIDDEN_ORGANISATION');const now=new Date().toISOString();const item:FindingRecord={...parsed,id:`finding_${randomUUID()}`,createdAt:now,updatedAt:now,status:'NEW',evidenceRecords:[],statusHistory:[{status:'NEW',changedAt:now,changedBy:'user_demo'}]};const items=await read();await write([...items,item]);return item;}
export async function getFinding(id:string,organisationId:string){const item=(await read()).find(value=>value.id===id);if(item&&item.organisationId!==organisationId)throw new Error('FORBIDDEN_ORGANISATION');return item;}
export async function addEvidence(id:string,input:unknown,organisationId:string){const items=await read();const index=items.findIndex(value=>value.id===id);if(index<0)return; if(items[index].organisationId!==organisationId)throw new Error('FORBIDDEN_ORGANISATION');const parsed=evidenceInputSchema.parse(input);const record={...parsed,id:`evidence_${randomUUID()}`,findingId:id,capturedAt:new Date().toISOString()};items[index].evidenceRecords.push(record);items[index].updatedAt=new Date().toISOString();await write(items);return record;}
export async function changeFindingStatus(id:string,status:Finding['status'],organisationId:string){const items=await read();const index=items.findIndex(value=>value.id===id);if(index<0)return; if(items[index].organisationId!==organisationId)throw new Error('FORBIDDEN_ORGANISATION');const now=new Date().toISOString();items[index].status=status;items[index].updatedAt=now;items[index].statusHistory.push({status,changedAt:now,changedBy:'user_demo'});await write(items);return items[index];}
