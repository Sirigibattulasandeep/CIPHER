import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { evidenceInputSchema, findingInputSchema, findingSchema, type Finding } from './contracts';
import { getBrand } from './store';
import { prisma } from './prisma';

export type EvidenceRecord = {
  id: string;
  findingId: string;
  kind: string;
  value: string;
  sourceUrl?: string;
  provenance: string;
  integrityHash?: string;
  capturedAt: string;
};
export type FindingRecord = Finding & {
  evidenceRecords: EvidenceRecord[];
  statusHistory: Array<{ status: Finding['status']; changedAt: string; changedBy: string }>;
};

const file = path.join(process.env.SENTRIX_DATA_DIR || path.join(process.cwd(), 'data'), 'findings.json');
const useDatabase = process.env.NODE_ENV !== 'test' && Boolean(process.env.DATABASE_URL);
const findingRelations = { evidences: true, statusHistory: { orderBy: { createdAt: 'asc' as const } } };
type DatabaseFinding = Prisma.FindingGetPayload<{ include: typeof findingRelations }>;

function fromDatabase(row: DatabaseFinding): FindingRecord {
  const finding = findingSchema.parse({
    ...row,
    sourceUrl: row.sourceUrl ?? undefined,
    scoringVersion: row.scoringVersion ?? undefined,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    detectionIndicators: Array.isArray(row.detectionIndicators) ? row.detectionIndicators : [],
    riskScoreBreakdown: Array.isArray(row.riskScoreBreakdown) ? row.riskScoreBreakdown : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
  return {
    ...finding,
    evidenceRecords: row.evidences.map(item => ({
      id: item.id,
      findingId: item.findingId,
      kind: item.kind,
      value: item.value,
      sourceUrl: item.sourceUrl ?? undefined,
      provenance: item.provenance,
      integrityHash: item.integrityHash ?? undefined,
      capturedAt: item.capturedAt.toISOString(),
    })),
    statusHistory: row.statusHistory.map(item => ({
      status: item.status as Finding['status'],
      changedAt: item.createdAt.toISOString(),
      changedBy: item.changedBy,
    })),
  };
}

async function read(): Promise<FindingRecord[]> {
  try {
    const saved: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(saved)) throw new Error('INVALID_PERSISTED_DATA');
    return saved.map(value => {
      if (!value || typeof value !== 'object') throw new Error('INVALID_PERSISTED_DATA');
      const item = value as FindingRecord;
      const parsed = findingSchema.safeParse(item);
      if (!parsed.success || !Array.isArray(item.evidenceRecords) || !Array.isArray(item.statusHistory)) {
        throw new Error('INVALID_PERSISTED_DATA');
      }
      return item;
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') return [];
    if (error instanceof SyntaxError) throw new Error('INVALID_PERSISTED_DATA', { cause: error });
    throw error;
  }
}

async function write(items: FindingRecord[]): Promise<void> {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(temporary, JSON.stringify(items, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

export async function listFindings(
  organisationId: string,
  options: { brandId?: string; status?: Finding['status']; severity?: Finding['severity']; page?: number; pageSize?: number } = {},
) {
  const page = Number.isSafeInteger(options.page) && options.page! >= 1 ? Math.min(options.page!, 100000) : 1;
  const pageSize = Number.isSafeInteger(options.pageSize) && options.pageSize! >= 1 ? Math.min(options.pageSize!, 100) : 20;
  if (useDatabase) {
    const where: Prisma.FindingWhereInput = {
      organisationId,
      ...(options.brandId ? { brandId: options.brandId } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.severity ? { severity: options.severity } : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.finding.findMany({ where, include: findingRelations, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.finding.count({ where }),
    ]);
    return { items: rows.map(fromDatabase), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  const filtered = (await read())
    .filter(item => item.organisationId === organisationId)
    .filter(item => !options.brandId || item.brandId === options.brandId)
    .filter(item => !options.status || item.status === options.status)
    .filter(item => !options.severity || item.severity === options.severity);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
  };
}

export async function createFinding(input: unknown, organisationId: string): Promise<FindingRecord> {
  const parsed = findingInputSchema.parse(input);
  if (parsed.organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
  const now = new Date();
  const id = `finding_${randomUUID()}`;

  if (useDatabase) {
    return prisma.$transaction(async transaction => {
      const brand = await transaction.brand.findFirst({ where: { id: parsed.brandId, organisationId }, select: { id: true } });
      if (!brand) throw new Error('BRAND_NOT_FOUND');
      const row = await transaction.finding.create({
        data: {
          id,
          organisationId,
          brandId: parsed.brandId,
          entityKey: parsed.affectedEntity.trim().toLocaleLowerCase().replace(/\s+/g, ' '),
          category: parsed.category,
          source: parsed.source,
          affectedEntity: parsed.affectedEntity,
          title: parsed.title,
          description: parsed.description,
          sourceUrl: parsed.sourceUrl,
          evidence: parsed.evidence as Prisma.InputJsonValue,
          detectionIndicators: parsed.detectionIndicators as Prisma.InputJsonValue,
          riskScore: parsed.riskScore,
          riskScoreBreakdown: parsed.riskScoreBreakdown as Prisma.InputJsonValue | undefined,
          scoringVersion: parsed.scoringVersion,
          severity: parsed.severity,
          confidence: parsed.confidence,
          status: 'NEW',
          createdAt: now,
          updatedAt: now,
          statusHistory: { create: { status: 'NEW', changedBy: 'user_demo' } },
        },
        include: findingRelations,
      });
      return fromDatabase(row);
    });
  }

  if (!await getBrand(parsed.brandId)) throw new Error('BRAND_NOT_FOUND');
  const timestamp = now.toISOString();
  const item: FindingRecord = {
    ...parsed,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    status: 'NEW',
    evidenceRecords: [],
    statusHistory: [{ status: 'NEW', changedAt: timestamp, changedBy: 'user_demo' }],
  };
  await write([...(await read()), item]);
  return item;
}

export async function getFinding(id: string, organisationId: string): Promise<FindingRecord | undefined> {
  if (useDatabase) {
    const row = await prisma.finding.findFirst({ where: { id, organisationId }, include: findingRelations });
    return row ? fromDatabase(row) : undefined;
  }
  const item = (await read()).find(value => value.id === id);
  if (item && item.organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
  return item;
}

export async function addEvidence(id: string, input: unknown, organisationId: string): Promise<EvidenceRecord | undefined> {
  if (useDatabase) {
    return prisma.$transaction(async transaction => {
      const finding = await transaction.finding.findFirst({ where: { id }, select: { id: true, organisationId: true } });
      if (!finding) return undefined;
      if (finding.organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
      const parsed = evidenceInputSchema.parse(input);
      const row = await transaction.evidence.create({ data: { findingId: id, ...parsed } });
      await transaction.finding.update({ where: { id }, data: { updatedAt: row.capturedAt } });
      return {
        id: row.id,
        findingId: row.findingId,
        kind: row.kind,
        value: row.value,
        sourceUrl: row.sourceUrl ?? undefined,
        provenance: row.provenance,
        integrityHash: row.integrityHash ?? undefined,
        capturedAt: row.capturedAt.toISOString(),
      };
    });
  }

  const items = await read();
  const index = items.findIndex(value => value.id === id);
  if (index < 0) return undefined;
  if (items[index].organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
  const parsed = evidenceInputSchema.parse(input);
  const record: EvidenceRecord = { ...parsed, id: `evidence_${randomUUID()}`, findingId: id, capturedAt: new Date().toISOString() };
  items[index].evidenceRecords.push(record);
  items[index].updatedAt = new Date().toISOString();
  await write(items);
  return record;
}

export async function changeFindingStatus(
  id: string,
  status: Finding['status'],
  organisationId: string,
): Promise<FindingRecord | undefined> {
  if (useDatabase) {
    return prisma.$transaction(async transaction => {
      const previous = await transaction.finding.findFirst({ where: { id }, select: { id: true, organisationId: true, status: true } });
      if (!previous) return undefined;
      if (previous.organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
      await transaction.finding.update({
        where: { id },
        data: { status, updatedAt: new Date() },
      });
      if (previous.status !== status) {
        await transaction.statusHistory.create({ data: { findingId: id, status, changedBy: 'user_demo' } });
      }
      const updated = await transaction.finding.findUniqueOrThrow({ where: { id }, include: findingRelations });
      return fromDatabase(updated);
    });
  }

  const items = await read();
  const index = items.findIndex(value => value.id === id);
  if (index < 0) return undefined;
  if (items[index].organisationId !== organisationId) throw new Error('FORBIDDEN_ORGANISATION');
  const now = new Date().toISOString();
  items[index].status = status;
  items[index].updatedAt = now;
  items[index].statusHistory.push({ status, changedAt: now, changedBy: 'user_demo' });
  await write(items);
  return items[index];
}
