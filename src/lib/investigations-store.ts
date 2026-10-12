import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getDemoOrganisationContext } from './auth';
import { listFindings } from './findings-store';
import { prisma } from './prisma';

export type InvestigationNote = { id: string; body: string; authorId: string; createdAt: string };
export type Investigation = {
  id: string; organisationId: string; findingId: string; brandId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'; assigneeId?: string;
  notes: InvestigationNote[]; createdAt: string; updatedAt: string;
};

const file = path.join(process.env.SENTRIX_DATA_DIR || path.join(process.cwd(), 'data'), 'investigations.json');
const useDatabase = Boolean(process.env.DATABASE_URL);

type DatabaseInvestigation = Prisma.InvestigationGetPayload<{ include: { finding: true; notes: true } }>;

function fromDatabase(row: DatabaseInvestigation): Investigation {
  return { id: row.id, organisationId: row.finding.organisationId, findingId: row.findingId,
    brandId: row.finding.brandId, status: row.status.toLocaleUpperCase() as Investigation['status'],
    assigneeId: row.assigneeId ?? undefined, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    notes: row.notes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map(note => ({
      id: note.id, body: note.body, authorId: note.authorId, createdAt: note.createdAt.toISOString(),
    })) };
}

async function readAll(): Promise<Investigation[]> {
  try {
    const raw: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(raw)) throw new Error('Investigation data must be an array.');
    return raw as Investigation[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

async function writeAll(values: Investigation[]): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(values, null, 2), 'utf8');
  await fs.rename(temporary, file);
}

export async function listInvestigations(findingId?: string): Promise<Investigation[]> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const rows = await prisma.investigation.findMany({
      where: { finding: { organisationId, ...(findingId ? { id: findingId } : {}) } },
      include: { finding: true, notes: true }, orderBy: { updatedAt: 'desc' },
    });
    return rows.map(fromDatabase);
  }
  return (await readAll()).filter(value => value.organisationId === organisationId && (!findingId || value.findingId === findingId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createInvestigation(findingId: string): Promise<Investigation | undefined> {
  const { organisationId, userId } = getDemoOrganisationContext();
  if (useDatabase) {
    const finding = await prisma.finding.findFirst({ where: { id: findingId, organisationId } });
    if (!finding) return undefined;
    const existing = await prisma.investigation.findUnique({ where: { findingId }, include: { finding: true, notes: true } });
    if (existing) return fromDatabase(existing);
    const created = await prisma.investigation.create({ data: { findingId, assigneeId: userId }, include: { finding: true, notes: true } });
    return fromDatabase(created);
  }
  const scopedFinding = findingId ? (await listFindings()).find(value => value.id === findingId) : undefined;
  if (!scopedFinding) return undefined;
  const all = await readAll();
  const existing = all.find(value => value.organisationId === organisationId && value.findingId === findingId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const created: Investigation = { id: `investigation_${randomUUID()}`, organisationId, findingId,
    brandId: scopedFinding.brandId, status: 'OPEN', assigneeId: userId, notes: [], createdAt: now, updatedAt: now };
  await writeAll([...all, created]);
  return created;
}

export async function addInvestigationNote(id: string, body: string): Promise<Investigation | undefined> {
  const { organisationId, userId } = getDemoOrganisationContext();
  if (useDatabase) {
    const existing = await prisma.investigation.findFirst({ where: { id, finding: { organisationId } } });
    if (!existing) return undefined;
    const updated = await prisma.investigation.update({ where: { id }, data: {
      notes: { create: { body, authorId: userId } }, updatedAt: new Date(),
    }, include: { finding: true, notes: true } });
    return fromDatabase(updated);
  }
  const all = await readAll();
  const index = all.findIndex(value => value.id === id && value.organisationId === organisationId);
  if (index < 0) return undefined;
  const now = new Date().toISOString();
  all[index] = { ...all[index], updatedAt: now, notes: [...all[index].notes, { id: `note_${randomUUID()}`, body, authorId: userId, createdAt: now }] };
  await writeAll(all);
  return all[index];
}

export async function updateInvestigationStatus(id: string, status: Investigation['status']): Promise<Investigation | undefined> {
  const { organisationId } = getDemoOrganisationContext();
  if (useDatabase) {
    const existing = await prisma.investigation.findFirst({ where: { id, finding: { organisationId } } });
    if (!existing) return undefined;
    const updated = await prisma.investigation.update({ where: { id }, data: { status: status.toLocaleLowerCase(), updatedAt: new Date() }, include: { finding: true, notes: true } });
    return fromDatabase(updated);
  }
  const all = await readAll();
  const index = all.findIndex(value => value.id === id && value.organisationId === organisationId);
  if (index < 0) return undefined;
  all[index] = { ...all[index], status, updatedAt: new Date().toISOString() };
  await writeAll(all);
  return all[index];
}
