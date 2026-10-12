import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { findingSchema, type Finding } from './contracts';
import { getDemoOrganisationContext } from './auth';
import { prisma } from './prisma';

const file = path.join(process.env.SENTRIX_DATA_DIR || path.join(process.cwd(), 'data'), 'findings.json');
const useDatabase = Boolean(process.env.DATABASE_URL);

type DatabaseFinding = Prisma.FindingGetPayload<{}>;

function fromDatabase(row: DatabaseFinding): Finding {
  return findingSchema.parse({ ...row,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    detectionIndicators: Array.isArray(row.detectionIndicators) ? row.detectionIndicators : [],
    riskScoreBreakdown: Array.isArray(row.riskScoreBreakdown) ? row.riskScoreBreakdown : undefined,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  });
}

function entityKey(value: string): string { return value.trim().toLocaleLowerCase().replace(/\s+/g, ' '); }

async function readAll(): Promise<Finding[]> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
    return Array.isArray(value) ? value.map(item => findingSchema.parse(item)) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAll(findings: Finding[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(findings, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

export async function listFindings(filters: { brandId?: string; source?: Finding['source']; q?: string } = {}): Promise<Finding[]> {
  const { organisationId } = getDemoOrganisationContext();
  const query = filters.q?.trim().toLocaleLowerCase();
  if (useDatabase) {
    const rows = await prisma.finding.findMany({ where: {
      organisationId, ...(filters.brandId ? { brandId: filters.brandId } : {}), ...(filters.source ? { source: filters.source } : {}),
      ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }, { affectedEntity: { contains: query, mode: 'insensitive' } }] } : {}),
    }, orderBy: { updatedAt: 'desc' } });
    return rows.map(fromDatabase);
  }
  return (await readAll())
    .filter(finding => finding.organisationId === organisationId)
    .filter(finding => !filters.brandId || finding.brandId === filters.brandId)
    .filter(finding => !filters.source || finding.source === filters.source)
    .filter(finding => !query || [finding.title, finding.description, finding.affectedEntity, ...finding.evidence]
      .some(value => value.toLocaleLowerCase().includes(query)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createFindings(values: Finding[]): Promise<Finding[]> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    return prisma.$transaction(async transaction => {
      const saved: Finding[] = [];
      const now = new Date();
      for (const raw of values) {
        const value = findingSchema.parse({ ...raw, organisationId });
        const key = entityKey(value.affectedEntity);
        const previous = await transaction.finding.findUnique({ where: {
          organisationId_brandId_source_entityKey: { organisationId, brandId: value.brandId, source: value.source, entityKey: key },
        } });
        const evidence = [...new Set([...(previous && Array.isArray(previous.evidence) ? previous.evidence as string[] : []), ...value.evidence])];
        const indicators = [...new Set([...(previous && Array.isArray(previous.detectionIndicators) ? previous.detectionIndicators as string[] : []), ...value.detectionIndicators])];
        const data = {
          organisationId, brandId: value.brandId, entityKey: key, category: value.category, source: value.source,
          affectedEntity: value.affectedEntity, title: value.title, description: value.description, sourceUrl: value.sourceUrl,
          evidence: evidence as Prisma.InputJsonValue, detectionIndicators: indicators as Prisma.InputJsonValue,
          riskScore: value.riskScore, riskScoreBreakdown: value.riskScoreBreakdown as Prisma.InputJsonValue | undefined,
          scoringVersion: value.scoringVersion, severity: value.severity, confidence: value.confidence,
        };
        const row = previous
          ? await transaction.finding.update({ where: { id: previous.id }, data: { ...data, status: previous.status, updatedAt: now } })
          : await transaction.finding.create({ data: { ...data, id: value.id || `finding_${randomUUID()}`, status: 'NEW', createdAt: now, updatedAt: now } });
        saved.push(fromDatabase(row));
      }
      return saved;
    });
  }
  const existing = await readAll();
  const now = new Date().toISOString();
  const saved: Finding[] = [];
  for (const value of values) {
    const normalizedEntity = value.affectedEntity.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    const previousIndex = existing.findIndex(item => item.organisationId === organisationId && item.brandId === value.brandId &&
      item.source === value.source && item.affectedEntity.trim().toLocaleLowerCase().replace(/\s+/g, ' ') === normalizedEntity);
    if (previousIndex >= 0) {
      const previous = existing[previousIndex];
      const updated = findingSchema.parse({
        ...value, id: previous.id, organisationId, status: previous.status,
        createdAt: previous.createdAt, updatedAt: now,
        evidence: [...new Set([...previous.evidence, ...value.evidence])],
        detectionIndicators: [...new Set([...previous.detectionIndicators, ...value.detectionIndicators])],
      });
      existing[previousIndex] = updated;
      saved.push(updated);
    } else {
      const created = findingSchema.parse({ ...value, id: value.id || `finding_${randomUUID()}`, organisationId,
        createdAt: value.createdAt || now, updatedAt: now, status: 'NEW' });
      existing.push(created);
      saved.push(created);
    }
  }
  await writeAll(existing);
  return saved;
}

export async function updateFindingStatus(id: string, status: Finding['status']): Promise<Finding | undefined> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const { userId } = getDemoOrganisationContext();
    return prisma.$transaction(async transaction => {
      const previous = await transaction.finding.findFirst({ where: { id, organisationId } });
      if (!previous) return undefined;
      const updated = await transaction.finding.update({ where: { id }, data: { status, updatedAt: new Date() } });
      if (previous.status !== status) await transaction.statusHistory.create({ data: { findingId: id, status, changedBy: userId } });
      return fromDatabase(updated);
    });
  }
  const all = await readAll();
  const index = all.findIndex(item => item.id === id && item.organisationId === organisationId);
  if (index < 0) return undefined;
  const updated = { ...all[index], status, updatedAt: new Date().toISOString() };
  all[index] = findingSchema.parse(updated);
  await writeAll(all);
  return all[index];
}
