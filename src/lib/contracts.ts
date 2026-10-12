import { z } from 'zod';

export const INDUSTRIES = ['EDTECH','FINTECH','ECOMMERCE','ENTERTAINMENT','HEALTHCARE','TECHNOLOGY_SAAS','TRAVEL','TELECOMMUNICATIONS','CONSUMER_GOODS_FASHION','GOVERNMENT_PUBLIC_SERVICES'] as const;
export type Industry = typeof INDUSTRIES[number];
export const SEVERITIES = ['CRITICAL','HIGH','MODERATE','LOW'] as const;
export type Severity = typeof SEVERITIES[number];
export const findingSchema = z.object({ id:z.string(), organisationId:z.string(), brandId:z.string(), category:z.string(), source:z.enum(['SOCIAL','MOBILE_APP','WEBSITE','DOMAIN']), affectedEntity:z.string(), title:z.string(), description:z.string(), sourceUrl:z.string().url().optional(), evidence:z.array(z.string()), detectionIndicators:z.array(z.string()), riskScore:z.number().int().min(0).max(100), severity:z.enum(SEVERITIES), confidence:z.number().int().min(0).max(100), status:z.enum(['NEW','INVESTIGATING','RESOLVED','FALSE_POSITIVE']), createdAt:z.string(), updatedAt:z.string() });
export type Finding = z.infer<typeof findingSchema>;
export const brandSchema = z.object({ name:z.string().trim().min(2,'Name must be at least 2 characters').max(80), aliases:z.array(z.string().trim()).default([]), description:z.string().max(500).default(''), logoUrl:z.union([z.string().url(),z.literal('')]).default(''), industry:z.enum(INDUSTRIES), subcategory:z.string().max(80).default(''), websiteUrl:z.union([z.string().url(),z.literal('')]).default(''), domains:z.array(z.string().trim().min(1)).default([]), socialProfiles:z.array(z.string().url()).default([]), keywords:z.array(z.string().trim()).default([]), impersonationIndicators:z.array(z.string().trim()).default([]), mobileApplications:z.array(z.object({name:z.string(),storeUrl:z.string().url().or(z.literal('')),publisher:z.string(),packageId:z.string()})).default([]), monitoringConfiguration:z.object({enabled:z.boolean().default(true),modules:z.array(z.string()).default(['social','web','apps']),rules:z.array(z.string()).default([]),frequency:z.enum(['hourly','daily','weekly']).default('daily')}).default({}) });
export type BrandInput = z.infer<typeof brandSchema>;
export type Brand = BrandInput & { id:string; organisationId:string; createdAt:string; updatedAt:string };
export type ApiError = { error:{ code:string; message:string; fields?:Record<string,string> } };
