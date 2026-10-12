import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { findingSchema, type Finding } from './contracts';
import { getDemoOrganisationContext } from './auth';

const file = path.join(process.env.SENTRIX_DATA_DIR || path.join(process.cwd(), 'data'), 'findings.json');

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
  const existing = await readAll();
  const now = new Date().toISOString();
  const created = values.map(value => findingSchema.parse({
    ...value,
    id: value.id || `finding_${randomUUID()}`,
    organisationId,
    createdAt: value.createdAt || now,
    updatedAt: now,
    status: 'NEW',
  }));
  await writeAll([...existing, ...created]);
  return created;
}

export async function updateFindingStatus(id: string, status: Finding['status']): Promise<Finding | undefined> {
  const { organisationId } = getDemoOrganisationContext();
  const all = await readAll();
  const index = all.findIndex(item => item.id === id && item.organisationId === organisationId);
  if (index < 0) return undefined;
  const updated = { ...all[index], status, updatedAt: new Date().toISOString() };
  all[index] = findingSchema.parse(updated);
  await writeAll(all);
  return all[index];
}
