import { Brand, EvidenceItem, Severity, ClassificationCategory } from "@/types";

export interface CandidateSocialProfile {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  bio: string;
  profileUrl?: string;
  avatarSimilarity?: number;
  links: string[];
  posts: { text: string; url?: string; observedAt?: string }[];
  verified?: boolean;
  sourceReliability?: number;
}

export interface SocialAnalysisResult {
  riskScore: number;
  severity: Severity;
  classification: ClassificationCategory;
  confidence: number;
  category: "potential_impersonation" | "fake_account" | "fake_giveaway";
  indicators: string[];
  evidence: EvidenceItem[];
  corroboratedCategories: string[];
  signalsIncreasingRisk: string[];
  signalsReducingRisk: string[];
  rationale: string;
}

// Regex patterns matching social impersonation and fraud
const SCAM_PATTERNS = [
  {
    name: "payment_request",
    regex: /\b(?:pay(?:ing)?|send)\s+(?:a\s+)?(?:processing|release|verification|handling)\s+fee\b/i,
    detail: "Requests payment of an upfront release or handling fee.",
  },
  {
    name: "credential_request",
    regex: /\b(?:send|share|provide|dm)\s+(?:us\s+)?(?:your\s+)?(?:otp|one[- ]time password|password|seed phrase|login code)\b/i,
    detail: "Directly requests sensitive credentials, OTP, or password via DM.",
  },
  {
    name: "prize_claim",
    regex: /\b(?:claim|redeem|winner)\s+(?:your\s+)?(?:prize|reward|giveaway|cashback|free gift)\b/i,
    detail: "Promotes deceptive giveaway or prize claim mechanics.",
  },
  {
    name: "investment_offer",
    regex: /\b(?:guaranteed|risk[- ]free)\s+(?:returns|profits|crypto multiplier)\b/i,
    detail: "Guarantees unrealistic financial returns.",
  },
  {
    name: "urgent_account_action",
    regex: /\b(?:account will be suspended|verify immediately|urgent action required|blocked account)\b/i,
    detail: "Fabricates artificial urgency regarding account suspension.",
  },
];

const SUPPORT_TERMS = /\b(?:support|helpdesk|customer care|customer service|claims|security team|desk|resolution)\b/i;
const OFFICIAL_CLAIMS = /\b(?:official|authorized|verified partner|brand team|headquarters|authentic)\b/i;
const PROMO_TERMS = /\b(?:giveaway|winner|free gift|limited time offer|claim your reward|prize|sale 90%)\b/i;

function normalize(str: string): string {
  return str
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function stringSimilarity(s1: string, s2: string): number {
  const norm1 = normalize(s1);
  const norm2 = normalize(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1;

  // Levenshtein distance
  const track = Array(norm2.length + 1)
    .fill(null)
    .map(() => Array(norm1.length + 1).fill(null));
  for (let i = 0; i <= norm1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= norm2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= norm2.length; j += 1) {
    for (let i = 1; i <= norm1.length; i += 1) {
      const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[norm2.length][norm1.length];
  const maxLen = Math.max(norm1.length, norm2.length);
  return Math.max(0, 1 - distance / maxLen);
}

function extractDomain(urlStr: string): string | null {
  try {
    const raw = urlStr.trim();
    if (!raw) return null;
    if (raw.includes(":") && !raw.startsWith("http://") && !raw.startsWith("https://")) {
      return null;
    }
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function analyzeSocialCandidate(
  brand: Brand,
  candidate: CandidateSocialProfile
): SocialAnalysisResult {
  const evidence: EvidenceItem[] = [];
  const signalsIncreasing: string[] = [];
  const signalsReducing: string[] = [];
  const categoryScores: Record<string, number> = {};
  const now = new Date().toISOString();

  function addEvidence(
    category: string,
    indicator: string,
    points: number,
    summary: string,
    detail: string,
    strength: "strong" | "supporting" | "context" = "supporting",
    sourceUrl?: string
  ) {
    categoryScores[category] = Math.max(categoryScores[category] || 0, points);
    evidence.push({
      id: `ev-${candidate.id}-${indicator}-${evidence.length + 1}`,
      indicator,
      summary,
      detail,
      strength,
      sourceUrl: sourceUrl || candidate.profileUrl,
      observedAt: now,
    });
    signalsIncreasing.push(summary);
  }

  // 1. Official Handle / Profile Exclusion check
  const exactOfficial = brand.officialSocialAccounts.some(
    (off) =>
      off.platform.toLowerCase() === candidate.platform.toLowerCase() &&
      (normalize(off.handle) === normalize(candidate.handle) ||
        (candidate.profileUrl && off.url && candidate.profileUrl.toLowerCase() === off.url.toLowerCase()))
  );

  if (exactOfficial) {
    return {
      riskScore: 0,
      severity: "safe",
      classification: "Official / Trusted",
      confidence: 100,
      category: "potential_impersonation",
      indicators: ["authorized_official_account"],
      evidence: [
        {
          id: `ev-${candidate.id}-official`,
          indicator: "authorized_official_account",
          summary: "Verified Official Account",
          detail: "Handle and profile metadata match registered official brand assets.",
          strength: "strong",
          sourceUrl: candidate.profileUrl,
          observedAt: now,
        },
      ],
      corroboratedCategories: ["identity"],
      signalsIncreasingRisk: [],
      signalsReducingRisk: ["Registered official brand profile in trusted registry"],
      rationale: "Account is in the brand's verified asset registry. Excluded from threat screening.",
    };
  }

  // 2. Handle Similarity
  const brandNames = [brand.name, ...brand.aliases];
  let maxHandleSim = 0;
  for (const name of brandNames) {
    const sim = stringSimilarity(name, candidate.handle);
    if (sim > maxHandleSim) maxHandleSim = sim;
  }

  if (maxHandleSim >= 0.72) {
    const points = maxHandleSim >= 0.9 ? 24 : 16;
    addEvidence(
      "identity",
      "handle_similarity",
      points,
      `Handle closely resembles brand identity (${Math.round(maxHandleSim * 100)}% match)`,
      `Handle '${candidate.handle}' shares high lexical similarity with brand name '${brand.name}'.`,
      maxHandleSim >= 0.9 ? "strong" : "supporting"
    );
  }

  // 3. Display Name Similarity
  let maxNameSim = 0;
  for (const name of brandNames) {
    const sim = stringSimilarity(name, candidate.displayName);
    if (sim > maxNameSim) maxNameSim = sim;
  }

  if (maxNameSim >= 0.8) {
    addEvidence(
      "identity",
      "profile_name_similarity",
      18,
      `Profile display name matches brand (${Math.round(maxNameSim * 100)}% match)`,
      `Display name '${candidate.displayName}' closely mimics brand '${brand.name}'.`,
      "supporting"
    );
  }

  // 4. Bio & Support/Official Claims
  const combinedBio = `${candidate.displayName} ${candidate.bio}`;
  const brandMentioned = brandNames.some((name) =>
    normalize(combinedBio).includes(normalize(name))
  );

  if (brandMentioned && SUPPORT_TERMS.test(combinedBio)) {
    addEvidence(
      "affiliation",
      "support_language",
      18,
      "Combines brand name with customer support language",
      "Profile biography implies an authorized support or resolution desk.",
      "strong"
    );
  }

  if (brandMentioned && OFFICIAL_CLAIMS.test(combinedBio)) {
    addEvidence(
      "affiliation",
      "official_affiliation_claim",
      16,
      "Claims official or authorized affiliation without registry confirmation",
      "Profile text asserts official status while not in the official asset registry.",
      "supporting"
    );
  }

  // 5. Bio and Post Links Analysis
  const allUrls: string[] = [...(candidate.links || [])];
  candidate.posts.forEach((p) => {
    if (p.url) allUrls.push(p.url);
    const matches = p.text.match(/https?:\/\/[^\s)\]}>,]+/gi);
    if (matches) allUrls.push(...matches);
  });

  const officialDomains = brand.officialDomains.map((d) => d.toLowerCase());
  for (const link of allUrls) {
    const domain = extractDomain(link);
    if (!domain) {
      addEvidence(
        "links",
        "invalid_url",
        8,
        "Malformed or unparsed URL in profile",
        `Link '${link}' could not be safely validated.`,
        "context"
      );
      continue;
    }

    const isOfficial = officialDomains.some(
      (off) => domain === off || domain.endsWith(`.${off}`)
    );

    if (!isOfficial) {
      // Check for domain lookalike
      const brandDomain = officialDomains[0] || brand.name.toLowerCase();
      const sim = stringSimilarity(brandDomain.split(".")[0], domain.split(".")[0]);
      if (sim >= 0.75) {
        addEvidence(
          "links",
          "brand_domain_lookalike",
          25,
          `Links to suspicious lookalike domain: ${domain}`,
          `Observed link domain '${domain}' mimics official brand domain '${brandDomain}'.`,
          "strong",
          link
        );
      } else {
        addEvidence(
          "links",
          "unlisted_domain",
          14,
          `Routes traffic to unverified external domain: ${domain}`,
          `Target domain '${domain}' is not in the brand's official domain registry.`,
          "supporting",
          link
        );
      }
    }
  }

  // 6. Scam & Fraud Language in Content
  const textCorpus = [
    `${candidate.displayName} ${candidate.bio}`,
    ...candidate.posts.map((p) => p.text),
  ];

  for (const text of textCorpus) {
    for (const scam of SCAM_PATTERNS) {
      if (scam.regex.test(text)) {
        addEvidence(
          "content",
          scam.name,
          26,
          scam.detail,
          `Matched fraudulent language pattern in profile content.`,
          "strong"
        );
        break;
      }
    }

    if (PROMO_TERMS.test(text) && brandMentioned) {
      addEvidence(
        "content",
        "brand_promotion",
        16,
        "Unauthorized brand giveaway or promotion promotion detected",
        "Content promotes giveaways or prizes using brand name without authorization.",
        "supporting"
      );
    }
  }

  // 7. Avatar Similarity
  if (
    candidate.avatarSimilarity !== undefined &&
    candidate.avatarSimilarity !== null &&
    candidate.avatarSimilarity >= 0.85
  ) {
    addEvidence(
      "assets",
      "avatar_similarity",
      22,
      `Avatar matches brand logo asset (${Math.round(candidate.avatarSimilarity * 100)}% visual match)`,
      "Computer vision analysis detected unauthorized use of protected brand logo in profile avatar.",
      "strong"
    );
  }

  // 8. Positive / Mitigating Signals
  if (/\b(?:unofficial|fan club|student run|parody|enthusiast)\b/i.test(combinedBio)) {
    signalsReducing.push("Explicit non-affiliation disclaimer present in bio");
  }

  // 9. Score calculation & Corroboration
  const sumPoints = Object.values(categoryScores).reduce((acc, p) => acc + p, 0);
  const activeCategories = Object.keys(categoryScores);
  const corroboratedCount = activeCategories.length;

  let riskScore = Math.min(100, sumPoints);
  if (signalsReducing.length > 0) {
    riskScore = Math.max(10, Math.floor(riskScore * 0.45));
  }

  let severity: Severity = "low";
  if (riskScore >= brand.riskThresholds.critical && corroboratedCount >= 3) {
    severity = "critical";
  } else if (riskScore >= brand.riskThresholds.high && corroboratedCount >= 2) {
    severity = "high";
  } else if (riskScore >= brand.riskThresholds.medium) {
    severity = "medium";
  }

  const reliability = candidate.sourceReliability ?? 0.8;
  const corroborationFactor = Math.min(1.0, corroboratedCount / 3);
  const confidence = Math.round(
    Math.min(99, Math.max(30, reliability * 100 * (0.4 + 0.6 * corroborationFactor)))
  );

  let category: "potential_impersonation" | "fake_account" | "fake_giveaway" = "potential_impersonation";
  if (activeCategories.includes("content") && /giveaway|reward|free/i.test(combinedBio)) {
    category = "fake_giveaway";
  } else if (activeCategories.includes("affiliation") || activeCategories.includes("identity")) {
    category = "potential_impersonation";
  } else {
    category = "fake_account";
  }

  let classification: ClassificationCategory = "Likely Legitimate";
  if (riskScore >= brand.riskThresholds.high && corroboratedCount >= 2) {
    classification = "High Risk";
  } else if (riskScore >= brand.riskThresholds.medium && corroboratedCount >= 2) {
    classification = "Suspicious";
  } else if (sumPoints > 0) {
    classification = "Needs Review";
  } else {
    classification = "Likely Legitimate";
  }

  const rationale =
    evidence.length === 0
      ? "No significant risk indicators identified in the candidate record."
      : `${corroboratedCount} corroborated risk categories (${activeCategories.join(", ")}) observed. Classification: ${classification.toUpperCase()} (Score: ${riskScore}/100).`;

  return {
    riskScore,
    severity,
    classification,
    confidence,
    category,
    indicators: evidence.map((e) => e.indicator),
    evidence,
    corroboratedCategories: activeCategories,
    signalsIncreasingRisk: signalsIncreasing,
    signalsReducingRisk: signalsReducing,
    rationale,
  };
}
