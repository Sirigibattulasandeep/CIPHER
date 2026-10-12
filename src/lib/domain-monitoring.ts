import type { Brand, Finding } from './contracts';
import { assessRisk, type RiskSignal } from './risk-scoring';
import { domainsFor, isOfficialDomain, safeDomain, type RecordOrigin } from './social-monitoring';
import { normalizeBrandText, normalizeLookalikeText } from './text-normalization';

export type DomainCandidate = {
  url: string;
  title?: string;
  description?: string;
  observedAt?: string;
  sourceReliability?: number;
  origin?: RecordOrigin;
};

const suspiciousPath = /(?:^|\/)(?:login|signin|verify|verification|secure|wallet|claim|support|reset|payment)(?:\/|$)/i;
const shorteners = new Set(['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy']);

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (!left || !right || left === right || Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const mismatches = [...left].flatMap((char, index) => char === right[index] ? [] : [index]);
    return mismatches.length === 1 || (mismatches.length === 2 && mismatches[1] === mismatches[0] + 1 &&
      left[mismatches[0]] === right[mismatches[1]] && left[mismatches[1]] === right[mismatches[0]]);
  }
  const [shorter, longer] = left.length < right.length ? [left, right] : [right, left];
  let i = 0; let j = 0; let skipped = false;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) { i += 1; j += 1; }
    else if (!skipped) { skipped = true; j += 1; }
    else return false;
  }
  return true;
}

/** Analyze only the submitted URL and metadata; this service performs no network requests. */
export function analyzeDomainCandidate(
  brand: Brand,
  candidate: DomainCandidate,
  source: 'DOMAIN' | 'WEBSITE' = 'DOMAIN',
  detectedAt = new Date().toISOString(),
): Finding | null {
  const host = safeDomain(candidate.url);
  if (!host) return null;
  const officialDomains = domainsFor(brand);
  if (officialDomains.some(domain => isOfficialDomain(host, domain))) return null;

  const signals: RiskSignal[] = [];
  const add = (category: string, indicator: string, score: number, summary: string, detail: string) => {
    signals.push({ category, indicator, score, summary, detail });
  };
  const rawAuthority = candidate.url.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').split(/[/?#]/)[0];
  const hostLabel = (rawAuthority.split('@').at(-1)?.split(':')[0] ?? host).split('.')[0].toLocaleLowerCase();
  const hostLabelParts = hostLabel.split(/[-\d]+/).filter(Boolean);
  const brandTerms = [brand.name, ...brand.aliases].map(normalizeLookalikeText).filter(term => term.length >= 3);
  const officialLabels = officialDomains.map(domain => domain.split('.')[0]);
  const officialLabelParts = officialLabels.flatMap(label => label.split(/[-\d]+/).filter(Boolean));
  const homoglyph = officialLabelParts.find(label => hostLabelParts.some(part => normalizeBrandText(part) !== normalizeBrandText(label) && normalizeLookalikeText(part) === normalizeLookalikeText(label)));
  const lookalike = officialLabelParts.find(label => hostLabelParts.some(part => editDistanceAtMostOne(normalizeLookalikeText(part), normalizeLookalikeText(label))));
  const brandReference = brandTerms.some(term => normalizeLookalikeText(hostLabel).includes(term) || term.includes(normalizeLookalikeText(hostLabel)));

  if (homoglyph) add('domain_identity', 'homoglyph_domain', 32, 'Domain label uses characters resembling an official domain',
    `Observed label “${hostLabel}” visually normalizes to configured official label “${homoglyph}”. Similarity is a screening signal only.`);
  else if (lookalike) add('domain_identity', 'lookalike_domain', 32, 'Domain label resembles an official domain',
    `Observed label “${hostLabel}” is one character away from configured official label “${lookalike}”. Similarity is a screening signal only.`);
  else if (brandReference && !officialDomains.includes(host)) add('domain_identity', 'brand_name_in_domain', 14,
    'Domain contains a configured brand name', 'The domain is not an official domain or its subdomain; confirm whether the use is authorized.');

  let parsed: URL;
  try { parsed = new URL(candidate.url.includes('://') ? candidate.url : `https://${candidate.url}`); }
  catch { return null; }
  const pageText = `${candidate.title ?? ''} ${candidate.description ?? ''}`;
  const mentionsBrand = brandTerms.some(term => normalizeLookalikeText(pageText).includes(term));
  if (parsed.protocol === 'http:' && (brandReference || mentionsBrand)) add('transport', 'brand_page_without_https', 8,
    'Brand-related page uses plain HTTP', 'The submitted URL uses HTTP. This does not establish malicious behavior.');
  if (suspiciousPath.test(parsed.pathname) && (brandReference || mentionsBrand)) add('url_behavior', 'credential_or_claim_path', 14,
    'Brand-related URL uses a sensitive path', `Submitted path “${parsed.pathname}” includes a login, verification, payment, or claim term.`);
  if (mentionsBrand && /\b(?:official|support|customer care|sign in|login|claim your reward|giveaway)\b/i.test(pageText)) {
    add('page_content', 'brand_affiliation_or_offer', 18, 'Submitted page text claims brand affiliation or promotes an offer',
      'Review the supplied title and description against approved brand communications.');
  }
  if (shorteners.has(host)) add('url_obfuscation', 'shortened_url', 8, 'URL uses a known shortening domain',
    'The destination was not expanded or fetched; inspect it through an approved safe-analysis process.');

  if (!signals.length) return null;
  const assessment = assessRisk(signals);
  const now = detectedAt;
  const origin = candidate.origin ?? 'IMPORTED';
  const reliability = Math.max(0, Math.min(1, candidate.sourceReliability ?? (origin === 'DEMO' ? 0.6 : 0.75)));
  const confidence = Math.round(reliability * (0.35 + 0.65 * Math.min(1, assessment.breakdown.length / 3)) *
    (candidate.title || candidate.description ? 0.85 : 0.65) * 100);
  const evidence = [
    `Record origin: ${origin}`,
    `Submitted URL: ${candidate.url}`,
    `Source observation time: ${candidate.observedAt ?? 'not supplied'}`,
    ...signals.map(signal => `${signal.summary}: ${signal.detail}`),
  ];
  return {
    id: `finding_${crypto.randomUUID()}`, organisationId: brand.organisationId, brandId: brand.id,
    category: source === 'DOMAIN' ? 'POTENTIAL_LOOKALIKE_DOMAIN' : 'POTENTIAL_WEBSITE_IMPERSONATION', source,
    affectedEntity: host, title: source === 'DOMAIN' ? `Potential lookalike domain: ${host}` : `Potential brand-mimicking website: ${host}`,
    description: `${assessment.breakdown.length} independent indicator categories contributed to this review priority. Validate ownership and evidence before taking action.`,
    sourceUrl: parsed.toString(), evidence, detectionIndicators: [...signals.map(signal => signal.indicator), `Record origin: ${origin}`],
    riskScore: assessment.score, severity: assessment.severity, confidence, status: 'NEW',
    riskScoreBreakdown: assessment.breakdown, scoringVersion: assessment.scoringVersion,
    createdAt: now, updatedAt: now,
  };
}

export function scanDomainCandidates(brand: Brand, candidates: DomainCandidate[], source: 'DOMAIN' | 'WEBSITE' = 'DOMAIN', detectedAt?: string): Finding[] {
  return candidates.map(candidate => analyzeDomainCandidate(brand, candidate, source, detectedAt))
    .filter((finding): finding is Finding => finding !== null);
}
