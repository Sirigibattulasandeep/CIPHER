import type { Brand, Finding } from './contracts';

export type RecordOrigin = 'CONNECTED' | 'IMPORTED' | 'DEMO';

export type SocialPostCandidate = {
  id?: string;
  text: string;
  url?: string;
  observedAt?: string;
};

export type SocialCandidate = {
  id?: string;
  platform: string;
  handle: string;
  displayName?: string;
  bio?: string;
  profileUrl?: string;
  links?: string[];
  posts?: SocialPostCandidate[];
  verified?: boolean | null;
  avatarSimilarity?: number | null;
  sourceReliability?: number;
  origin?: RecordOrigin;
  observedAt?: string;
};

export type AppCandidate = {
  id?: string;
  store: string;
  appId: string;
  name: string;
  publisher?: string;
  description?: string;
  storeUrl?: string;
  links?: string[];
  logoSimilarity?: number | null;
  sourceReliability?: number;
  origin?: RecordOrigin;
  observedAt?: string;
};

type Signal = {
  category: string;
  indicator: string;
  score: number;
  summary: string;
  detail: string;
  sourceUrl?: string;
};

const scamPatterns: Array<[string, RegExp]> = [
  ['payment_request', /\b(?:pay(?:ing)?|send)\s+(?:a\s+)?(?:processing|release|verification)\s+fee\b/i],
  ['credential_request', /\b(?:send|share|provide)\s+(?:us\s+)?(?:your\s+)?(?:otp|one[- ]time password|password|login code)\b/i],
  ['prize_claim', /\b(?:claim|redeem)\s+(?:your\s+)?(?:prize|reward|giveaway)\b/i],
  ['investment_offer', /\b(?:guaranteed|risk[- ]free)\s+(?:returns|profits)\b/i],
  ['urgent_account_action', /\b(?:account will be suspended|verify immediately|urgent action required)\b/i],
];
const supportTerms = /\b(?:support|helpdesk|customer care|customer service|claims|security team)\b/i;
const officialClaims = /\b(?:official|authorized|authorised|verified partner|brand team)\b/i;
const promoTerms = /\b(?:giveaway|winner|free gift|limited time offer|claim your reward|prize)\b/i;
const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'your', 'our', 'app', 'mobile', 'official']);

function normalize(value: string): string {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
}

function words(value: string): string[] {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Optimal-string-alignment distance includes adjacent character transpositions. */
function similarity(leftValue: string, rightValue: string): number {
  const left = Array.from(normalize(leftValue));
  const right = Array.from(normalize(rightValue));
  if (!left.length || !right.length) return 0;
  const table = Array.from({ length: left.length + 1 }, (_, i) => {
    const row = Array.from({ length: right.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0));
    return row;
  });
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        table[i][j] = Math.min(table[i][j], table[i - 2][j - 2] + cost);
      }
    }
  }
  return 1 - table[left.length][right.length] / Math.max(left.length, right.length);
}

function safeDomain(value: string): string | undefined {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    const host = url.hostname.toLocaleLowerCase().replace(/\.$/, '');
    if (!host || host.split('.').some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

function domainDistanceOne(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const different = [...left].flatMap((char, i) => char === right[i] ? [] : [i]);
    return different.length === 1 || (different.length === 2 && different[1] === different[0] + 1 &&
      left[different[0]] === right[different[1]] && left[different[1]] === right[different[0]]);
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

function normalizedPlatform(value: string): string {
  const platform = value.toLocaleLowerCase().replace(/^www\./, '').trim();
  const aliases: Record<string, string> = {
    'x': 'x.com', twitter: 'x.com', 'twitter.com': 'x.com', 'x.com': 'x.com',
    instagram: 'instagram.com', 'instagram.com': 'instagram.com',
    facebook: 'facebook.com', 'facebook.com': 'facebook.com',
    linkedin: 'linkedin.com', 'linkedin.com': 'linkedin.com',
    tiktok: 'tiktok.com', 'tiktok.com': 'tiktok.com',
  };
  return aliases[platform] ?? platform;
}

function profileParts(value: string): { platform: string; handle: string } | undefined {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) return undefined;
    const platform = normalizedPlatform(url.hostname);
    const handle = ['company', 'in', 'user'].includes(parts[0].toLowerCase()) ? parts[1] : parts[0];
    return handle ? { platform, handle: handle.replace(/^@/, '') } : undefined;
  } catch {
    return undefined;
  }
}

function officialSocialMatches(brand: Brand, candidate: SocialCandidate): boolean {
  const candidateHandle = normalize(candidate.handle.replace(/^@/, ''));
  const candidateUrl = candidate.profileUrl ? profileParts(candidate.profileUrl) : undefined;
  return brand.socialProfiles.some(profile => {
    const official = profileParts(profile);
    if (!official) return false;
    const platformMatches = normalizedPlatform(candidate.platform) === official.platform;
    const urlMatches = candidateUrl?.platform === official.platform && normalize(candidateUrl.handle) === normalize(official.handle);
    const handleMatches = platformMatches && candidateHandle === normalize(official.handle);
    return urlMatches || handleMatches;
  });
}

function brandNames(brand: Brand): string[] {
  return [brand.name, ...brand.aliases].filter(Boolean);
}

function domainsFor(brand: Brand): string[] {
  const domains = [...brand.domains];
  if (brand.websiteUrl) domains.push(brand.websiteUrl);
  return [...new Set(domains.map(safeDomain).filter((value): value is string => Boolean(value)))];
}

function isOfficialDomain(host: string, official: string): boolean {
  return host === official || host.endsWith(`.${official}`);
}

function nameExpansionSimilarity(reference: string, candidate: string): number {
  let value = similarity(reference, candidate);
  const referenceWords = words(reference).filter(word => !stopWords.has(word));
  const candidateWords = words(candidate).filter(word => !stopWords.has(word));
  const allTermsSurvive = referenceWords.length >= 2 && referenceWords.every(referenceWord =>
    candidateWords.some(candidateWord => similarity(referenceWord, candidateWord) >= 0.8));
  if (allTermsSurvive) value = Math.max(value, 0.86);
  return value;
}

function sourceOrigin(origin: RecordOrigin | undefined): RecordOrigin {
  return origin ?? 'IMPORTED';
}

function severityFor(score: number, categories: number): Finding['severity'] {
  if (score >= 85 && categories >= 4) return 'CRITICAL';
  if (score >= 70 && categories >= 3) return 'HIGH';
  if (score >= 40 && categories >= 2) return 'MODERATE';
  return 'LOW';
}

function findingFromSignals(args: {
  brand: Brand;
  source: Finding['source'];
  entity: string;
  title: string;
  signals: Signal[];
  origin: RecordOrigin;
  reliability: number;
  completeness: number;
  detectedAt?: string;
  observedAt?: string;
}): Finding {
  const categoryScores = new Map<string, number>();
  for (const signal of args.signals) categoryScores.set(signal.category, Math.max(categoryScores.get(signal.category) ?? 0, signal.score));
  const categories = [...categoryScores.keys()];
  const riskScore = Math.min(100, [...categoryScores.values()].reduce((sum, score) => sum + score, 0));
  const severity = severityFor(riskScore, categories.length);
  const sourceReliability = Math.max(0, Math.min(1, args.reliability));
  const confidence = Math.round(sourceReliability * (0.35 + 0.65 * Math.min(1, categories.length / 3)) * (0.5 + 0.5 * args.completeness) * 100);
  const now = args.detectedAt ?? new Date().toISOString();
  const evidence = [`Record origin: ${args.origin}`, `Source observation time: ${args.observedAt ?? 'not supplied'}`,
    ...args.signals.map(signal => `${signal.summary}: ${signal.detail}${signal.sourceUrl ? ` [source: ${signal.sourceUrl}]` : ''}`)];
  return {
    id: `finding_${crypto.randomUUID()}`,
    organisationId: args.brand.organisationId,
    brandId: args.brand.id,
    category: args.source === 'MOBILE_APP' ? 'POTENTIAL_APP_IMPERSONATION' : 'POTENTIAL_SOCIAL_IMPERSONATION',
    source: args.source,
    affectedEntity: args.entity,
    title: args.title,
    description: severity === 'LOW'
      ? 'Limited or uncorroborated indicators were found. Review source context before taking action.'
      : `${categories.length} indicator categories contribute to this review priority. Validate the evidence before taking action.`,
    sourceUrl: args.signals.find(signal => signal.sourceUrl && safeDomain(signal.sourceUrl))?.sourceUrl,
    evidence: [`Record origin: ${args.origin}`, ...evidence],
    detectionIndicators: [...args.signals.map(signal => signal.indicator), `Record origin: ${args.origin}`],
    riskScore,
    severity,
    confidence,
    status: 'NEW',
    createdAt: now,
    updatedAt: now,
  };
}

export function analyzeSocialCandidate(brand: Brand, candidate: SocialCandidate, detectedAt?: string): Finding | null {
  const signals: Signal[] = [];
  const add = (category: string, indicator: string, score: number, summary: string, detail: string, sourceUrl?: string) => {
    signals.push({ category, indicator, score, summary, detail, sourceUrl });
  };
  const handle = candidate.handle.replace(/^@/, '');
  const officialMatch = officialSocialMatches(brand, candidate);
  const officialAccounts = brand.socialProfiles.map(profileParts).filter((part): part is NonNullable<typeof part> => Boolean(part))
    .filter(part => part.platform === normalizedPlatform(candidate.platform));
  const bestHandle = Math.max(0, ...officialAccounts.map(account => similarity(account.handle, handle)));
  if (!officialMatch && bestHandle >= 0.78) {
    add('identity', 'handle_similarity', 22, 'Username resembles an official account',
      `Username similarity to a configured ${candidate.platform} account is ${Math.round(bestHandle * 100)}%.`, candidate.profileUrl);
  }
  const names = brandNames(brand);
  const nameSimilarity = Math.max(0, ...names.map(name => similarity(name, candidate.displayName ?? '')));
  if (!officialMatch && nameSimilarity >= 0.82) {
    add('identity', 'profile_name_similarity', 20, 'Profile name resembles the brand',
      `Best configured brand-name similarity is ${Math.round(nameSimilarity * 100)}%.`, candidate.profileUrl);
  }
  const combined = `${candidate.displayName ?? ''} ${candidate.bio ?? ''}`;
  const normalizedCombined = normalize(combined);
  const hasBrand = names.some(name => normalize(name) && normalizedCombined.includes(normalize(name)));
  if (!officialMatch && hasBrand && supportTerms.test(combined)) {
    add('affiliation', 'support_language', 15, 'Brand reference appears with support language',
      'The profile name or biography combines the brand with support-style wording.', candidate.profileUrl);
  }
  if (!officialMatch && hasBrand && officialClaims.test(combined)) {
    add('affiliation', 'official_affiliation_claim', 14, 'Profile claims official affiliation',
      'Official-style wording is not verified against the configured account list.', candidate.profileUrl);
  }

  const officialDomains = domainsFor(brand);
  const links: Array<{ value: string; source?: string }> = (candidate.links ?? []).map(value => ({ value, source: candidate.profileUrl }));
  for (const post of candidate.posts ?? []) {
    if (post.url) links.push({ value: post.url, source: post.url });
    for (const match of post.text.match(/https?:\/\/[^\s)\]}>,]+/gi) ?? []) links.push({ value: match, source: post.url });
  }
  const seenLinks = new Set<string>();
  for (const link of links) {
    if (seenLinks.has(link.value)) continue;
    seenLinks.add(link.value);
    const host = safeDomain(link.value);
    if (!host) {
      add('links', 'invalid_url', 8, 'A supplied URL could not be parsed safely',
        'The record contains a malformed or unsupported URL; no network request was made.', link.source);
      continue;
    }
    if (officialDomains.some(domain => isOfficialDomain(host, domain))) continue;
    const firstLabel = host.split('.')[0];
    const officialLabel = officialDomains.map(domain => domain.split('.')[0]).sort((a, b) => b.length - a.length)[0] ?? '';
    if (officialLabel && domainDistanceOne(firstLabel, officialLabel)) {
      add('links', 'brand_domain_lookalike', 24, 'Link uses a domain resembling the official brand domain',
        `Observed host ${host} differs by one character or transposition from a configured brand domain.`, link.source ?? link.value);
    } else {
      add('links', 'unlisted_domain', 16, 'Profile or post links to an unlisted domain',
        `Observed host ${host} is not in the brand's configured official-domain list.`, link.source ?? link.value);
    }
  }

  const textSources = [{ text: `${candidate.displayName ?? ''} ${candidate.bio ?? ''}`, url: candidate.profileUrl },
    ...(candidate.posts ?? []).map(post => ({ text: post.text, url: post.url }))];
  for (const item of textSources) {
    for (const [indicator, pattern] of scamPatterns) {
      const match = item.text.match(pattern);
      if (match) add('content', indicator, 25, 'Content contains scam-associated wording',
        `Matched wording: “${match[0]}”. This is a review signal, not proof of fraud.`, item.url);
    }
    if (hasBrand && promoTerms.test(item.text)) add('content', 'brand_promotion', 16,
      'Brand-related promotion or giveaway detected', 'Review whether the offer is authorized by the brand.', item.url);
  }
  if (!officialMatch && Number.isFinite(candidate.avatarSimilarity) && (candidate.avatarSimilarity ?? 0) >= 0.86 && (candidate.avatarSimilarity ?? 0) <= 1) {
    add('assets', 'avatar_similarity', 22, 'Profile image resembles the configured brand logo',
      `Upstream image analysis reported ${Math.round((candidate.avatarSimilarity ?? 0) * 100)}% similarity against ${brand.logoUrl || 'the supplied logo asset'}.`, candidate.profileUrl);
  }
  if (!officialMatch && candidate.verified === true) add('metadata', 'platform_verified', 4,
    'Platform verification is present but does not verify brand affiliation',
    'Platform verification is treated as metadata, not proof that this is an official brand account.', candidate.profileUrl);

  const completenessFields = [handle, candidate.displayName, candidate.bio, candidate.profileUrl,
    candidate.links?.length ? 'links' : '', candidate.posts?.length ? 'posts' : '', candidate.verified === undefined || candidate.verified === null ? '' : 'verified'];
  const completeness = completenessFields.filter(Boolean).length / completenessFields.length;
  if (completeness < 1) signals.push({ category: 'context', indicator: 'record_completeness', score: 0,
    summary: 'Source record is incomplete', detail: `Missing: ${['handle', 'display name', 'biography', 'profile URL', 'links', 'posts', 'verification metadata'].filter((_, index) => !completenessFields[index]).join(', ')}. Missing data lowers confidence and is not a risk signal.` });

  const origin = sourceOrigin(candidate.origin);
  const riskSignals = signals.filter(signal => signal.category !== 'context');
  if (!riskSignals.length) return null;
  const finding = findingFromSignals({ brand, source: 'SOCIAL', entity: `${candidate.platform} ${candidate.handle}`,
    title: `Potential social impersonation: ${candidate.handle || candidate.displayName || 'unknown profile'}`,
    signals: riskSignals, origin, reliability: candidate.sourceReliability ?? (origin === 'CONNECTED' ? 0.9 : origin === 'DEMO' ? 0.6 : 0.75),
    completeness, detectedAt, observedAt: candidate.observedAt });
  if (signals.some(signal => signal.category === 'context')) {
    finding.evidence = [...finding.evidence, ...signals.filter(signal => signal.category === 'context').map(signal => `${signal.summary}: ${signal.detail}`)];
    finding.detectionIndicators = [...finding.detectionIndicators, 'record_completeness'];
  }
  return finding;
}

export function analyzeAppCandidate(brand: Brand, candidate: AppCandidate, detectedAt?: string): Finding | null {
  const appId = candidate.appId.trim().toLocaleLowerCase();
  const isOfficial = Boolean(appId) && brand.mobileApplications.some(app => app.packageId.trim().toLocaleLowerCase() === appId);
  if (isOfficial) return null;

  const signals: Signal[] = [];
  const add = (category: string, indicator: string, score: number, summary: string, detail: string, sourceUrl?: string) => {
    signals.push({ category, indicator, score, summary, detail, sourceUrl });
  };
  const configuredNames = brand.mobileApplications.map(app => app.name).filter(Boolean);
  const referenceNames = configuredNames.length ? configuredNames : brandNames(brand);
  const scoredNames = referenceNames.map(name => ({ name, score: nameExpansionSimilarity(name, candidate.name) })).sort((a, b) => b.score - a.score);
  const best = scoredNames[0] ?? { name: brand.name, score: 0 };
  const normalizedName = normalize(candidate.name);
  const hasBrand = brandNames(brand).some(name => normalize(name) && normalizedName.includes(normalize(name)));
  if (best.score >= 0.84) add('identity', 'app_name_similarity', 22, 'App name resembles a configured brand app',
    `Similarity to “${best.name}” is ${Math.round(best.score * 100)}%; character swaps, spacing, and added words are considered.`, candidate.storeUrl);
  else if (hasBrand) add('identity', 'brand_name_reference', 10, 'App title contains a brand name',
    'A brand name appears in the app title; this alone is a weak signal.', candidate.storeUrl);
  if (hasBrand && officialClaims.test(`${candidate.name} ${candidate.description ?? ''}`)) add('affiliation', 'official_affiliation_claim', 14,
    'App claims official affiliation', 'Official-style wording is not confirmed by the configured official app list.', candidate.storeUrl);

  const matchingOfficialApps = brand.mobileApplications.filter(app => app.name && nameExpansionSimilarity(app.name, candidate.name) >= 0.7);
  const expectedPublishers = [...new Set(matchingOfficialApps.map(app => app.publisher).filter(Boolean))];
  if (candidate.publisher?.trim() && expectedPublishers.length && !expectedPublishers.some(publisher => normalize(publisher) === normalize(candidate.publisher ?? ''))) {
    add('publisher', 'publisher_mismatch', 24, 'Similar app lists a different publisher',
      `Observed publisher “${candidate.publisher}”; configured publisher: ${expectedPublishers.join(', ')}.`, candidate.storeUrl);
  }

  for (const [indicator, pattern] of scamPatterns) {
    const match = (candidate.description ?? '').match(pattern);
    if (match) add('content', indicator, 24, 'App description contains scam-associated wording',
      `Matched wording: “${match[0]}”. Review the listing and app behavior before acting.`, candidate.storeUrl);
  }
  if (candidate.logoSimilarity !== undefined && candidate.logoSimilarity !== null && Number.isFinite(candidate.logoSimilarity) && candidate.logoSimilarity >= 0.86 && candidate.logoSimilarity <= 1) {
    add('assets', 'logo_similarity', 22, 'App icon resembles the configured brand logo',
      `Upstream image analysis reported ${Math.round(candidate.logoSimilarity * 100)}% similarity against ${brand.logoUrl || 'the supplied logo asset'}.`, candidate.storeUrl);
  }
  const officialDomains = domainsFor(brand);
  const links = [...(candidate.links ?? []), ...((candidate.description ?? '').match(/https?:\/\/[^\s)\]}>,]+/gi) ?? [])];
  for (const link of new Set(links)) {
    const host = safeDomain(link);
    if (!host) {
      add('links', 'invalid_url', 8, 'A store link could not be parsed safely', 'No network request was made.', candidate.storeUrl);
    } else if (!officialDomains.some(domain => isOfficialDomain(host, domain))) {
      const label = host.split('.')[0];
      const officialLabel = officialDomains.map(domain => domain.split('.')[0]).sort((a, b) => b.length - a.length)[0] ?? '';
      if (officialLabel && domainDistanceOne(label, officialLabel)) add('links', 'brand_domain_lookalike', 24,
        'App links to a lookalike domain', `Observed host ${host} resembles a configured brand domain.`, link);
      else add('links', 'unlisted_domain', 22, 'App links to an unlisted domain', `Observed host ${host} is not configured as official.`, link);
    }
  }

  const fields = [candidate.appId, candidate.name, candidate.publisher, candidate.description, candidate.storeUrl, candidate.logoSimilarity];
  const completeness = fields.filter(value => value !== undefined && value !== null && value !== '').length / fields.length;
  const origin = sourceOrigin(candidate.origin);
  const finding = findingFromSignals({ brand, source: 'MOBILE_APP', entity: `${candidate.store} · ${candidate.name} · ${candidate.publisher || 'publisher unknown'}`,
    title: `Potential app impersonation: ${candidate.name || 'unnamed listing'}`, signals, origin,
    reliability: candidate.sourceReliability ?? (origin === 'CONNECTED' ? 0.9 : origin === 'DEMO' ? 0.6 : 0.75), completeness, detectedAt, observedAt: candidate.observedAt });
  if (completeness < 1) {
    finding.evidence.push(`Store record is incomplete: ${['store listing ID', 'app name', 'publisher', 'description', 'store URL', 'logo analysis'].filter((_, index) => fields[index] === undefined || fields[index] === null || fields[index] === '').join(', ')}. Missing data lowers confidence, not risk.`);
    finding.detectionIndicators.push('record_completeness');
  }
  return finding;
}

export function scanRecords(brand: Brand, kind: 'social' | 'apps', records: Array<SocialCandidate | AppCandidate>, detectedAt?: string): Finding[] {
  if (kind === 'social') return (records as SocialCandidate[]).map(candidate => analyzeSocialCandidate(brand, candidate, detectedAt)).filter((finding): finding is Finding => finding !== null);
  return (records as AppCandidate[]).map(candidate => analyzeAppCandidate(brand, candidate, detectedAt)).filter((finding): finding is Finding => finding !== null);
}
