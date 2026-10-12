import { Brand, EvidenceItem, Severity, ClassificationCategory } from "@/types";

export interface CandidateApp {
  id: string;
  name: string;
  platform: "Android" | "iOS";
  publisherName: string;
  packageId: string;
  storeUrl?: string;
  marketplace: string; // "Google Play", "Apple App Store", "APKPure", "APKMirror", "Third-Party"
  iconUrl?: string;
  description: string;
  version?: string;
  downloadsCount?: string;
  permissions?: string[];
  iconSimilarity?: number;
}

export interface AppComparisonMatrix {
  field: string;
  officialValue: string;
  candidateValue: string;
  isMatch: boolean;
  riskWeight: "high" | "medium" | "low" | "none";
}

export interface AppAnalysisResult {
  riskScore: number;
  severity: Severity;
  classification: ClassificationCategory;
  confidence: number;
  indicators: string[];
  evidence: EvidenceItem[];
  comparisonMatrix: AppComparisonMatrix[];
  corroboratedCategories: string[];
  signalsIncreasingRisk: string[];
  signalsReducingRisk: string[];
  rationale: string;
}

const HIGH_RISK_PERMISSIONS = [
  "READ_SMS",
  "RECEIVE_SMS",
  "SEND_SMS",
  "SYSTEM_ALERT_WINDOW",
  "BIND_ACCESSIBILITY_SERVICE",
  "READ_CONTACTS",
  "RECORD_AUDIO",
  "READ_EXTERNAL_STORAGE",
  "QUERY_ALL_PACKAGES",
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stringSimilarity(s1: string, s2: string): number {
  const norm1 = normalize(s1);
  const norm2 = normalize(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1;

  const track = Array(norm2.length + 1)
    .fill(null)
    .map(() => Array(norm1.length + 1).fill(null));
  for (let i = 0; i <= norm1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= norm2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= norm2.length; j += 1) {
    for (let i = 1; i <= norm1.length; i += 1) {
      const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  const distance = track[norm2.length][norm1.length];
  const maxLen = Math.max(norm1.length, norm2.length);
  return Math.max(0, 1 - distance / maxLen);
}

export function analyzeMobileAppCandidate(
  brand: Brand,
  candidate: CandidateApp
): AppAnalysisResult {
  const evidence: EvidenceItem[] = [];
  const signalsIncreasing: string[] = [];
  const signalsReducing: string[] = [];
  const comparisonMatrix: AppComparisonMatrix[] = [];
  const categoryScores: Record<string, number> = {};
  const now = new Date().toISOString();

  // Find most relevant official app on matching platform
  const officialApp =
    brand.officialApps.find((a) => a.platform.toLowerCase() === candidate.platform.toLowerCase()) ||
    brand.officialApps[0];

  function addEvidence(
    category: string,
    indicator: string,
    points: number,
    summary: string,
    detail: string,
    strength: "strong" | "supporting" | "context" = "supporting"
  ) {
    categoryScores[category] = Math.max(categoryScores[category] || 0, points);
    evidence.push({
      id: `ev-${candidate.id}-${indicator}-${evidence.length + 1}`,
      indicator,
      summary,
      detail,
      strength,
      sourceUrl: candidate.storeUrl,
      observedAt: now,
    });
    signalsIncreasing.push(summary);
  }

  // Exact Match check against all registered official apps
  const matchingOfficialApp = brand.officialApps.find(
    (off) =>
      normalize(off.packageId) === normalize(candidate.packageId) &&
      normalize(off.publisherName) === normalize(candidate.publisherName)
  );

  if (matchingOfficialApp) {
    return {
      riskScore: 0,
      severity: "safe",
      classification: "Official / Trusted",
      confidence: 100,
      indicators: ["official_verified_app"],
      evidence: [
        {
          id: `ev-${candidate.id}-verified`,
          indicator: "official_verified_app",
          summary: "Verified Official Mobile App",
          detail: "Candidate package identifier and publisher match official registered brand assets.",
          strength: "strong",
          sourceUrl: candidate.storeUrl,
          observedAt: now,
        },
      ],
      comparisonMatrix: [
        {
          field: "Publisher Name",
          officialValue: matchingOfficialApp.publisherName,
          candidateValue: candidate.publisherName,
          isMatch: true,
          riskWeight: "none",
        },
        {
          field: "Package Identifier",
          officialValue: matchingOfficialApp.packageId,
          candidateValue: candidate.packageId,
          isMatch: true,
          riskWeight: "none",
        },
      ],
      corroboratedCategories: ["app_identity"],
      signalsIncreasingRisk: [],
      signalsReducingRisk: ["Registered official brand application in trusted registry"],
      rationale: "Candidate is a verified official mobile application. Excluded from threat screening.",
    };
  }

  // 1. Publisher Comparison
  const pubMatch = officialApp
    ? normalize(officialApp.publisherName) === normalize(candidate.publisherName)
    : false;

  comparisonMatrix.push({
    field: "Publisher Entity",
    officialValue: officialApp ? officialApp.publisherName : "Unregistered",
    candidateValue: candidate.publisherName,
    isMatch: pubMatch,
    riskWeight: pubMatch ? "none" : "high",
  });

  if (!pubMatch) {
    addEvidence(
      "publisher",
      "publisher_mismatch",
      32,
      `Publisher mismatch: '${candidate.publisherName}' vs official '${officialApp?.publisherName || brand.name}'`,
      "Candidate app is published by an unauthorized third-party entity.",
      "strong"
    );
  } else {
    signalsReducing.push("Publisher name matches official record");
  }

  // 2. Package / Bundle Identifier Comparison
  const pkgMatch = officialApp
    ? normalize(officialApp.packageId) === normalize(candidate.packageId)
    : false;

  comparisonMatrix.push({
    field: "Package Identifier",
    officialValue: officialApp ? officialApp.packageId : "Unregistered",
    candidateValue: candidate.packageId,
    isMatch: pkgMatch,
    riskWeight: pkgMatch ? "none" : "high",
  });

  if (!pkgMatch) {
    addEvidence(
      "package_id",
      "package_id_anomaly",
      28,
      `Package ID anomaly: '${candidate.packageId}'`,
      `Official application uses package '${officialApp?.packageId || "N/A"}'. Candidate package differs completely.`,
      "strong"
    );
  }

  // 3. Application Title & Brand Name Similarity
  const titleSim = stringSimilarity(brand.name, candidate.name);
  const brandNames = [brand.name, ...brand.aliases];
  const containsBrand = brandNames.some((n) =>
    normalize(candidate.name).includes(normalize(n))
  );

  comparisonMatrix.push({
    field: "Application Title",
    officialValue: officialApp ? officialApp.name : brand.name,
    candidateValue: candidate.name,
    isMatch: officialApp ? normalize(officialApp.name) === normalize(candidate.name) : false,
    riskWeight: containsBrand && !pubMatch ? "high" : "low",
  });

  if (containsBrand && !pubMatch) {
    addEvidence(
      "trademark",
      "unauthorized_trademark_usage",
      24,
      `App title '${candidate.name}' uses protected brand trademark`,
      "Third-party application incorporates brand identity in title without official publisher credentials.",
      "strong"
    );
  }

  // 4. Marketplace Distribution Channel
  const isOfficialStore =
    candidate.marketplace === "Google Play" || candidate.marketplace === "Apple App Store";

  comparisonMatrix.push({
    field: "Distribution Marketplace",
    officialValue: "Google Play / Apple App Store",
    candidateValue: candidate.marketplace,
    isMatch: isOfficialStore,
    riskWeight: isOfficialStore ? "none" : "medium",
  });

  if (!isOfficialStore) {
    addEvidence(
      "distribution",
      "unverified_apk_mirror",
      16,
      `Distributed via unverified marketplace: ${candidate.marketplace}`,
      "Application is hosted on third-party APK aggregator or unauthorized store.",
      "supporting"
    );
  }

  // 5. Dangerous / Intrusive Permissions Inspection
  const detectedHighRiskPerms = (candidate.permissions || []).filter((perm) =>
    HIGH_RISK_PERMISSIONS.includes(perm)
  );

  if (detectedHighRiskPerms.length > 0) {
    addEvidence(
      "permissions",
      "excessive_dangerous_permissions",
      22,
      `High-risk permissions requested (${detectedHighRiskPerms.join(", ")})`,
      `Manifest requests access to sensitive Android subsystems that facilitate credential theft or overlay attacks.`,
      "strong"
    );
  }

  // 6. Score Calculation
  const totalScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
  const activeCategories = Object.keys(categoryScores);
  const corroboratedCount = activeCategories.length;

  let riskScore = Math.min(100, totalScore);
  if (signalsReducing.length > 0) {
    riskScore = Math.max(15, Math.floor(riskScore * 0.5));
  }

  let severity: Severity = "low";
  if (riskScore >= brand.riskThresholds.critical && corroboratedCount >= 3) {
    severity = "critical";
  } else if (riskScore >= brand.riskThresholds.high && corroboratedCount >= 2) {
    severity = "high";
  } else if (riskScore >= brand.riskThresholds.medium) {
    severity = "medium";
  }

  const confidence = Math.min(
    98,
    Math.max(45, Math.round(75 + corroboratedCount * 7))
  );

  let classification: ClassificationCategory = "Likely Legitimate";
  if (riskScore >= brand.riskThresholds.high && corroboratedCount >= 2) {
    classification = "High Risk";
  } else if (riskScore >= brand.riskThresholds.medium && corroboratedCount >= 2) {
    classification = "Suspicious";
  } else if (totalScore > 0) {
    classification = "Needs Review";
  } else {
    classification = "Likely Legitimate";
  }

  const rationale =
    evidence.length === 0
      ? "Application matches authorized publisher parameters."
      : `${corroboratedCount} risk categories detected (publisher mismatch, package anomaly, permissions). Classification: ${classification.toUpperCase()} (Score: ${riskScore}/100).`;

  return {
    riskScore,
    severity,
    classification,
    confidence,
    indicators: evidence.map((e) => e.indicator),
    evidence,
    comparisonMatrix,
    corroboratedCategories: activeCategories,
    signalsIncreasingRisk: signalsIncreasing,
    signalsReducingRisk: signalsReducing,
    rationale,
  };
}

