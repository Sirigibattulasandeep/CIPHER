export type Role = "owner" | "admin" | "analyst" | "investigator" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  organizationId: string;
}

export type Industry =
  | "Banking & Financial Services"
  | "E-commerce & Retail"
  | "E-commerce"
  | "Healthcare"
  | "Education"
  | "Technology & SaaS"
  | "Travel & Hospitality"
  | "FinTech"
  | "EdTech"
  | "Gaming & Media"
  | "Telecommunications"
  | "Consumer Goods";

export type ClassificationCategory =
  | "Official / Trusted"
  | "Likely Legitimate"
  | "Needs Review"
  | "Suspicious"
  | "High Risk";

export interface OfficialSocialAccount {
  platform: string;
  handle: string;
  url: string;
  verified?: boolean;
}

export interface OfficialApp {
  name: string;
  platform: "Android" | "iOS";
  publisherName: string;
  packageId: string;
  storeUrl: string;
}

export interface Brand {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  industry: Industry;
  logoUrl?: string;
  description: string;
  aliases: string[];
  officialWebsites: string[];
  officialDomains: string[];
  officialSocialAccounts: OfficialSocialAccount[];
  officialApps: OfficialApp[];
  keywords: string[];
  riskThresholds: {
    medium: number;
    high: number;
    critical: number;
  };
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type ThreatCategory =
  | "potential_impersonation"
  | "fake_account"
  | "phishing"
  | "brand_domain_lookalike"
  | "suspicious_app"
  | "fake_giveaway"
  | "credential_harvesting"
  | "unauthorized_trademark";

export type SourceModule = "social" | "app" | "domain" | "web";

export type Severity = "critical" | "high" | "medium" | "low" | "safe";

export type FindingStatus =
  | "new"
  | "under_review"
  | "investigating"
  | "confirmed_threat"
  | "false_positive"
  | "resolved";

export interface EvidenceItem {
  id: string;
  indicator: string;
  summary: string;
  detail: string;
  sourceUrl?: string;
  strength: "strong" | "supporting" | "context";
  observedAt: string;
  metadata?: Record<string, any>;
}

export interface Finding {
  id: string;
  orgId: string;
  brandId: string;
  brandName: string;
  category: ThreatCategory;
  sourceModule: SourceModule;
  entityType: "social_profile" | "social_post" | "mobile_app" | "domain" | "website" | "url";
  entityName: string;
  entityIdentifier: string;
  entityUrl?: string;
  title: string;
  description: string;
  indicators: string[];
  evidence: EvidenceItem[];
  riskScore: number; // 0 - 100
  severity: Severity;
  confidence: number; // 0 - 100%
  corroboratedCategories: string[];
  signalsIncreasingRisk: string[];
  signalsReducingRisk: string[];
  firstDetectedAt: string;
  lastObservedAt: string;
  status: FindingStatus;
  classification?: ClassificationCategory;
  assignedAnalyst?: string;
  investigationId?: string;
  aiSummary?: string;
  recommendedAction: string;
  isSimulated?: boolean;
}

export type InvestigationPriority = "p1" | "p2" | "p3" | "p4";

export interface InvestigationNote {
  id: string;
  author: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

export interface InvestigationTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  type: "status_change" | "note_added" | "action_triggered" | "analyst_assigned" | "evidence_linked";
  description: string;
}

export type ResponseActionType =
  | "dmca_takedown"
  | "platform_abuse_report"
  | "registrar_abuse_notice"
  | "app_store_flag"
  | "ad_network_cease"
  | "internal_security_alert";

export interface ResponseAction {
  id: string;
  type: ResponseActionType;
  title: string;
  target: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  referenceNumber?: string;
  initiatedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Investigation {
  id: string;
  orgId: string;
  brandId: string;
  brandName: string;
  title: string;
  summary: string;
  findingIds: string[];
  severity: Severity;
  priority: InvestigationPriority;
  status: FindingStatus;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  notes: InvestigationNote[];
  timeline: InvestigationTimelineEvent[];
  responseActions: ResponseAction[];
  resolutionSummary?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringJob {
  id: string;
  brandId: string;
  module: SourceModule;
  name: string;
  schedule: "Continuous" | "Hourly" | "Daily" | "Manual";
  status: "active" | "running" | "idle" | "error";
  lastRunAt?: string;
  nextRunAt?: string;
  itemsScannedTotal: number;
  threatsIdentifiedTotal: number;
  lastExecutionSummary?: string;
}

export interface AppNotification {
  id: string;
  orgId: string;
  type: "critical_threat" | "investigation_update" | "scan_complete" | "action_resolved";
  title: string;
  message: string;
  severity: Severity;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
}

