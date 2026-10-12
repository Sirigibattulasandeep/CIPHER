import fs from "fs";
import path from "path";
import {
  Organization,
  User,
  Brand,
  Finding,
  Investigation,
  MonitoringJob,
  AppNotification,
  AuditEvent,
  FindingStatus,
} from "@/types";
import {
  SEED_ORGANIZATION,
  SEED_USERS,
  SEED_BRANDS,
  SEED_FINDINGS,
  SEED_INVESTIGATIONS,
  SEED_MONITORING_JOBS,
  SEED_NOTIFICATIONS,
} from "./seed-data";

interface DbSchema {
  organizations: Organization[];
  users: User[];
  brands: Brand[];
  findings: Finding[];
  investigations: Investigation[];
  monitoringJobs: MonitoringJob[];
  notifications: AppNotification[];
  auditLogs: AuditEvent[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function getInitialData(): DbSchema {
  return {
    organizations: [SEED_ORGANIZATION],
    users: SEED_USERS,
    brands: SEED_BRANDS,
    findings: SEED_FINDINGS,
    investigations: SEED_INVESTIGATIONS,
    monitoringJobs: SEED_MONITORING_JOBS,
    notifications: SEED_NOTIFICATIONS,
    auditLogs: [
      {
        id: "audit-01",
        timestamp: "2026-03-12T08:00:00Z",
        actorId: "usr-01",
        actorName: "Alex Vance",
        action: "SYSTEM_INITIALIZED",
        resourceType: "System",
        resourceId: "sentrix-core",
        details: "SENTRIX Threat Intelligence platform loaded and seeded.",
      },
    ],
  };
}

let memoryDb: DbSchema | null = null;

function ensureDbFile(): DbSchema {
  if (memoryDb) {
    return memoryDb;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      if (content.trim()) {
        memoryDb = JSON.parse(content) as DbSchema;
        return memoryDb;
      }
    }
  } catch (err) {
    console.warn("Could not read from persistent db file, using memory storage:", err);
  }

  memoryDb = getInitialData();
  saveDb(memoryDb);
  return memoryDb;
}

function saveDb(data: DbSchema): void {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.warn("Could not write to db file, persistent store fallback in memory:", err);
  }
}

export const db = {
  // Organizations
  getOrganizations(): Organization[] {
    return ensureDbFile().organizations;
  },
  getOrganization(id: string): Organization | undefined {
    return ensureDbFile().organizations.find((o) => o.id === id);
  },

  // Users
  getUsers(): User[] {
    return ensureDbFile().users;
  },
  getUser(id: string): User | undefined {
    return ensureDbFile().users.find((u) => u.id === id);
  },

  // Brands
  getBrands(orgId?: string): Brand[] {
    const list = ensureDbFile().brands;
    return orgId ? list.filter((b) => b.orgId === orgId) : list;
  },
  getBrand(id: string): Brand | undefined {
    return ensureDbFile().brands.find((b) => b.id === id);
  },
  createBrand(data: Omit<Brand, "id" | "createdAt" | "updatedAt">): Brand {
    const state = ensureDbFile();
    const id = `brand-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newBrand: Brand = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    state.brands.push(newBrand);
    saveDb(state);
    return newBrand;
  },
  updateBrand(id: string, updates: Partial<Brand>): Brand | null {
    const state = ensureDbFile();
    const idx = state.brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const updated = {
      ...state.brands[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    state.brands[idx] = updated;
    saveDb(state);
    return updated;
  },
  deleteBrand(id: string): boolean {
    const state = ensureDbFile();
    const lenBefore = state.brands.length;
    state.brands = state.brands.filter((b) => b.id !== id);
    if (state.brands.length !== lenBefore) {
      saveDb(state);
      return true;
    }
    return false;
  },

  // Findings
  getFindings(filter?: {
    brandId?: string;
    category?: string;
    sourceModule?: string;
    severity?: string;
    status?: string;
    query?: string;
  }): Finding[] {
    let list = ensureDbFile().findings;
    if (!filter) return list;

    if (filter.brandId && filter.brandId !== "all") {
      list = list.filter((f) => f.brandId === filter.brandId);
    }
    if (filter.category) {
      list = list.filter((f) => f.category === filter.category);
    }
    if (filter.sourceModule) {
      list = list.filter((f) => f.sourceModule === filter.sourceModule);
    }
    if (filter.severity) {
      list = list.filter((f) => f.severity.toLowerCase() === filter.severity!.toLowerCase());
    }
    if (filter.status) {
      list = list.filter((f) => f.status.toLowerCase() === filter.status!.toLowerCase());
    }
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.entityName.toLowerCase().includes(q) ||
          f.brandName.toLowerCase().includes(q) ||
          f.indicators.some((ind) => ind.toLowerCase().includes(q))
      );
    }
    return list;
  },
  getFinding(id: string): Finding | undefined {
    return ensureDbFile().findings.find((f) => f.id === id);
  },
  createFinding(data: Omit<Finding, "id" | "firstDetectedAt" | "lastObservedAt">): Finding {
    const state = ensureDbFile();
    const id = `find-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newFinding: Finding = {
      ...data,
      id,
      firstDetectedAt: now,
      lastObservedAt: now,
    };
    state.findings.unshift(newFinding);

    // If critical or high, create a notification
    if (newFinding.severity === "critical" || newFinding.severity === "high") {
      state.notifications.unshift({
        id: `notif-${Date.now()}`,
        orgId: newFinding.orgId,
        type: "critical_threat",
        title: `New ${newFinding.severity.toUpperCase()} Finding: ${newFinding.brandName}`,
        message: `${newFinding.title} detected on ${newFinding.sourceModule}. (Score: ${newFinding.riskScore}/100)`,
        severity: newFinding.severity,
        read: false,
        link: `/findings/${id}`,
        createdAt: now,
      });
    }

    saveDb(state);
    return newFinding;
  },
  updateFinding(id: string, updates: Partial<Finding>): Finding | null {
    const state = ensureDbFile();
    const idx = state.findings.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    const updated = {
      ...state.findings[idx],
      ...updates,
      lastObservedAt: new Date().toISOString(),
    };
    state.findings[idx] = updated;
    saveDb(state);
    return updated;
  },
  deleteFinding(id: string): boolean {
    const state = ensureDbFile();
    const lenBefore = state.findings.length;
    state.findings = state.findings.filter((f) => f.id !== id);
    if (state.findings.length !== lenBefore) {
      saveDb(state);
      return true;
    }
    return false;
  },

  // Investigations
  getInvestigations(filter?: { brandId?: string; status?: string; query?: string }): Investigation[] {
    let list = ensureDbFile().investigations;
    if (!filter) return list;
    if (filter.brandId && filter.brandId !== "all") {
      list = list.filter((i) => i.brandId === filter.brandId);
    }
    if (filter.status) {
      list = list.filter((i) => i.status === filter.status);
    }
    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.brandName.toLowerCase().includes(q)
      );
    }
    return list;
  },
  getInvestigation(id: string): Investigation | undefined {
    return ensureDbFile().investigations.find((i) => i.id === id);
  },
  createInvestigation(data: Omit<Investigation, "id" | "createdAt" | "updatedAt">): Investigation {
    const state = ensureDbFile();
    const id = `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newInv: Investigation = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    state.investigations.unshift(newInv);

    // Link findings
    if (newInv.findingIds.length > 0) {
      state.findings = state.findings.map((f) => {
        if (newInv.findingIds.includes(f.id)) {
          return { ...f, investigationId: id, status: "investigating" as FindingStatus };
        }
        return f;
      });
    }

    saveDb(state);
    return newInv;
  },
  updateInvestigation(id: string, updates: Partial<Investigation>): Investigation | null {
    const state = ensureDbFile();
    const idx = state.investigations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const prev = state.investigations[idx];
    const updated = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // If status changed, record timeline event and sync linked findings
    if (updates.status && updates.status !== prev.status) {
      updated.timeline = [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "Analyst",
          type: "status_change",
          description: `Status changed from '${prev.status}' to '${updates.status}'`,
        },
        ...updated.timeline,
      ];

      // Update linked findings status
      state.findings = state.findings.map((f) => {
        if (updated.findingIds.includes(f.id)) {
          return { ...f, status: updates.status as FindingStatus };
        }
        return f;
      });
    }

    state.investigations[idx] = updated;
    saveDb(state);
    return updated;
  },
  addInvestigationNote(id: string, note: { author: string; authorRole: string; text: string }): Investigation | null {
    const state = ensureDbFile();
    const idx = state.investigations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const newNote = {
      ...note,
      id: `note-${Date.now()}`,
      createdAt: now,
    };
    const inv = state.investigations[idx];
    inv.notes.unshift(newNote);
    inv.timeline.unshift({
      id: `evt-${Date.now()}`,
      timestamp: now,
      actor: note.author,
      type: "note_added",
      description: `Added investigation note: "${note.text.slice(0, 40)}..."`,
    });
    inv.updatedAt = now;
    saveDb(state);
    return inv;
  },
  addResponseAction(id: string, action: { type: any; title: string; target: string; notes?: string }): Investigation | null {
    const state = ensureDbFile();
    const idx = state.investigations.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const refNum = `ACT-${Math.floor(100000 + Math.random() * 900000)}`;
    const newAction = {
      ...action,
      id: `act-${Date.now()}`,
      status: "in_progress" as const,
      referenceNumber: refNum,
      initiatedAt: now,
    };
    const inv = state.investigations[idx];
    inv.responseActions.push(newAction);
    inv.timeline.unshift({
      id: `evt-${Date.now()}`,
      timestamp: now,
      actor: "Security Response Agent",
      type: "action_triggered",
      description: `Triggered response action: ${action.title} (Ref: ${refNum})`,
    });
    inv.updatedAt = now;
    saveDb(state);
    return inv;
  },
  updateResponseActionStatus(
    invId: string,
    actionId: string,
    status: "pending" | "in_progress" | "completed" | "failed"
  ): Investigation | null {
    const state = ensureDbFile();
    const idx = state.investigations.findIndex((i) => i.id === invId);
    if (idx === -1) return null;
    const inv = state.investigations[idx];
    const actIdx = inv.responseActions.findIndex((a) => a.id === actionId);
    if (actIdx === -1) return null;
    inv.responseActions[actIdx].status = status;
    if (status === "completed") {
      inv.responseActions[actIdx].completedAt = new Date().toISOString();
    }
    inv.updatedAt = new Date().toISOString();
    saveDb(state);
    return inv;
  },

  // Monitoring Jobs
  getMonitoringJobs(brandId?: string): MonitoringJob[] {
    const list = ensureDbFile().monitoringJobs;
    return brandId && brandId !== "all" ? list.filter((j) => j.brandId === brandId) : list;
  },
  runMonitoringJob(jobId: string): MonitoringJob | null {
    const state = ensureDbFile();
    const idx = state.monitoringJobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    const scannedDelta = Math.floor(20 + Math.random() * 50);
    const threatsFound = Math.random() > 0.7 ? 1 : 0;
    const job = state.monitoringJobs[idx];
    job.lastRunAt = now;
    job.itemsScannedTotal += scannedDelta;
    job.threatsIdentifiedTotal += threatsFound;
    job.lastExecutionSummary = `Execution complete at ${now.slice(11, 19)}: Scanned ${scannedDelta} records, identified ${threatsFound} candidate threats.`;
    saveDb(state);
    return job;
  },

  // Notifications
  getNotifications(orgId?: string): AppNotification[] {
    const list = ensureDbFile().notifications;
    return orgId ? list.filter((n) => n.orgId === orgId) : list;
  },
  markNotificationRead(id: string): boolean {
    const state = ensureDbFile();
    const notif = state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      saveDb(state);
      return true;
    }
    return false;
  },
  markAllNotificationsRead(orgId?: string): void {
    const state = ensureDbFile();
    state.notifications.forEach((n) => {
      if (!orgId || n.orgId === orgId) {
        n.read = true;
      }
    });
    saveDb(state);
  },

  // Reset database to initial seed data
  resetDatabase(): void {
    const fresh = getInitialData();
    saveDb(fresh);
  },
};

