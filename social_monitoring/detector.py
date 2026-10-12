"""Deterministic, explainable social impersonation screening.

This module analyzes records supplied by an authorized connector, an import,
or a clearly labeled demo dataset. It performs no network requests and does
not determine that an account is fraudulent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from difflib import SequenceMatcher
from enum import Enum
import re
import unicodedata
from urllib.parse import urlparse


class RecordSource(str, Enum):
    CONNECTED = "connected"
    IMPORTED = "imported"
    DEMO = "demo"


class FindingStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


@dataclass(frozen=True)
class OfficialAccount:
    platform: str
    handle: str


@dataclass(frozen=True)
class OfficialApp:
    store: str
    app_id: str
    name: str
    publisher: str | None = None
    store_url: str | None = None
    description: str = ""


@dataclass(frozen=True)
class BrandProfile:
    id: str
    name: str
    official_accounts: tuple[OfficialAccount, ...] = ()
    official_domains: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    industry: str | None = None
    official_apps: tuple[OfficialApp, ...] = ()


@dataclass(frozen=True)
class SocialPost:
    text: str
    url: str | None = None
    post_id: str | None = None
    observed_at: datetime | None = None


@dataclass(frozen=True)
class CandidateProfile:
    id: str
    platform: str
    handle: str
    display_name: str = ""
    bio: str = ""
    profile_url: str | None = None
    links: tuple[str, ...] = ()
    posts: tuple[SocialPost, ...] = ()
    verified: bool | None = None
    account_created_at: datetime | None = None
    avatar_similarity: float | None = None
    source: RecordSource = RecordSource.IMPORTED
    source_reliability: float = 0.75
    observed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class Evidence:
    id: str
    indicator: str
    summary: str
    detail: str
    source_url: str | None = None
    observed_at: datetime | None = None
    strength: str = "supporting"


@dataclass(frozen=True)
class RiskAssessment:
    score: int
    severity: str
    confidence: float
    rationale: str
    corroborated_categories: tuple[str, ...]


@dataclass(frozen=True)
class Finding:
    """Temporary module-level finding shape; map to SENTRIX's shared contract."""

    id: str
    brand_id: str
    brand_name: str
    affected_profile_id: str | None
    platform: str
    profile_url: str | None
    category: str
    description: str
    indicators: tuple[str, ...]
    evidence: tuple[Evidence, ...]
    assessment: RiskAssessment
    source: RecordSource
    observed_at: datetime
    affected_asset_id: str | None = None
    asset_type: str = "social_profile"
    status: FindingStatus = FindingStatus.OPEN


@dataclass(frozen=True)
class IndicatorConfig:
    """Weights and thresholds can be replaced by shared policy later."""

    handle_similarity: int = 20
    name_similarity: int = 18
    support_language: int = 14
    scam_language: int = 24
    suspicious_domain: int = 22
    brand_domain_lookalike: int = 24
    avatar_similarity: int = 22
    misleading_affiliation: int = 14
    promo_language: int = 16
    medium_threshold: int = 40
    high_threshold: int = 70


DEFAULT_CONFIG = IndicatorConfig()

_SCAM_PATTERNS = (
    ("payment_request", re.compile(r"\b(?:pay(?:ing)?|send)\s+(?:a\s+)?(?:processing|release|verification)\s+fee\b", re.I)),
    ("credential_request", re.compile(r"\b(?:send|share|provide)\s+(?:us\s+)?(?:your\s+)?(?:otp|one[- ]time password|password|login code)\b", re.I)),
    ("prize_claim", re.compile(r"\b(?:claim|redeem)\s+(?:your\s+)?(?:prize|reward|giveaway)\b", re.I)),
    ("investment_offer", re.compile(r"\b(?:guaranteed|risk[- ]free)\s+(?:returns|profits)\b", re.I)),
    ("urgent_account_action", re.compile(r"\b(?:account will be suspended|verify immediately|urgent action required)\b", re.I)),
)
_SUPPORT_TERMS = re.compile(r"\b(?:support|helpdesk|customer care|customer service|claims|security team)\b", re.I)
_OFFICIAL_CLAIMS = re.compile(r"\b(?:official|authorized|verified partner|brand team)\b", re.I)
_PROMO_TERMS = re.compile(r"\b(?:giveaway|winner|free gift|limited time offer|claim your reward|prize)\b", re.I)
_TOKENIZER = re.compile(r"[a-z0-9]+")


def normalize_name(value: str) -> str:
    """Normalize Unicode text for deterministic lookalike comparisons."""
    value = unicodedata.normalize("NFKD", unicodedata.normalize("NFKC", value).casefold())
    return "".join(ch for ch in value if not unicodedata.combining(ch) and ch.isalnum())


def similarity(first: str, second: str) -> float:
    left, right = normalize_name(first), normalize_name(second)
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right).ratio()


def _domain(url_or_domain: str) -> str | None:
    raw = url_or_domain.strip()
    if not raw:
        return None
    try:
        parsed = urlparse(raw if "://" in raw else "https://" + raw)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
            return None
        parsed.port  # Validate that any supplied port is numeric and in range.
            host = parsed.hostname.rstrip(".").encode("idna").decode("ascii").casefold()
    except (UnicodeError, ValueError):
        return None
        labels = host.split(".")
        if any(not label or len(label) > 63 or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label)
               for label in labels):
            return None
        return host


def _is_domain_or_subdomain(domain: str, official: str) -> bool:
    return domain == official or domain.endswith("." + official)


def _distance_one(left: str, right: str) -> bool:
    """True for a single insertion, deletion, substitution, or transposition."""
    if left == right:
        return False
    if abs(len(left) - len(right)) > 1:
        return False
    if len(left) == len(right):
        mismatches = [i for i, (a, b) in enumerate(zip(left, right)) if a != b]
        if len(mismatches) == 1:
            return True
        return (len(mismatches) == 2 and mismatches[1] == mismatches[0] + 1
                and left[mismatches[0]] == right[mismatches[1]]
                and left[mismatches[1]] == right[mismatches[0]])
    short, long = (left, right) if len(left) < len(right) else (right, left)
    i = j = skips = 0
    while i < len(short) and j < len(long):
        if short[i] == long[j]:
            i += 1
            j += 1
        else:
            skips += 1
            j += 1
            if skips > 1:
                return False
    return True


def _evidence_id(candidate_id: str, indicator: str, ordinal: int) -> str:
    return f"{candidate_id}:{indicator}:{ordinal}"


def analyze_candidate(
    brand: BrandProfile,
    candidate: CandidateProfile,
    config: IndicatorConfig = DEFAULT_CONFIG,
) -> Finding:
    """Analyze one candidate and return a traceable, review-oriented finding.

    Weak indicators are deliberately capped at low severity. Medium and high
    require evidence from multiple indicator categories.
    """
    evidence: list[Evidence] = []
    category_scores: dict[str, int] = {}

    def add(category: str, indicator: str, points: int, summary: str, detail: str,
            source_url: str | None = None, observed_at: datetime | None = None,
            strength: str = "supporting") -> None:
        category_scores[category] = max(category_scores.get(category, 0), points)
        evidence.append(Evidence(
            id=_evidence_id(candidate.id, indicator, len(evidence) + 1),
            indicator=indicator, summary=summary, detail=detail,
            source_url=source_url, observed_at=observed_at or candidate.observed_at,
            strength=strength,
        ))

    official_handles = [a.handle.lstrip("@") for a in brand.official_accounts
                        if a.platform.casefold() == candidate.platform.casefold()]
    exact_official = any(normalize_name(candidate.handle.lstrip("@")) == normalize_name(h)
                         for h in official_handles)
    handle_sim = max((similarity(h, candidate.handle.lstrip("@")) for h in official_handles), default=0.0)
    if not exact_official and handle_sim >= 0.88:
        add("identity", "handle_similarity", config.handle_similarity,
            "Username closely resembles an official handle",
            f"Similarity to a configured {candidate.platform} handle is {handle_sim:.0%}.",
            candidate.profile_url, strength="strong" if handle_sim >= 0.95 else "supporting")

    names = (brand.name,) + brand.aliases
    name_sim = max((similarity(name, candidate.display_name) for name in names), default=0.0)
    if not exact_official and name_sim >= 0.84:
        add("identity", "profile_name_similarity", config.name_similarity,
            "Profile name resembles the brand", f"Best configured brand-name similarity is {name_sim:.0%}.",
            candidate.profile_url, strength="supporting")

    profile_text = f"{candidate.display_name} {candidate.bio}"
    has_brand_reference = any(normalize_name(n) in normalize_name(profile_text) for n in names if normalize_name(n))
    if has_brand_reference and _SUPPORT_TERMS.search(profile_text) and not exact_official:
        add("affiliation", "support_language", config.support_language,
            "Brand reference appears with support language",
            "The profile name or biography combines the brand name with support-style wording.",
            candidate.profile_url)
    if has_brand_reference and _OFFICIAL_CLAIMS.search(profile_text) and not exact_official:
        add("affiliation", "official_affiliation_claim", config.misleading_affiliation,
            "Profile claims an official or authorized affiliation",
            "The profile text makes an official-style claim that is not confirmed by the configured handle list.",
            candidate.profile_url)

    official_domains = tuple(filter(None, (_domain(x) for x in brand.official_domains)))
    urls: list[tuple[str, str | None, datetime | None]] = [(u, candidate.profile_url, candidate.observed_at) for u in candidate.links]
    for post in candidate.posts:
        if post.url:
            urls.append((post.url, post.url, post.observed_at))
        urls.extend((u, post.url, post.observed_at) for u in re.findall(r"https?://[^\s)\]}>,]+", post.text, re.I))
    seen: set[str] = set()
    for raw_url, evidence_url, when in urls:
        if raw_url in seen:
            continue
        seen.add(raw_url)
        domain = _domain(raw_url)
        if domain is None:
            add("links", "invalid_url", 8, "A supplied link could not be safely parsed",
                "The record contains a malformed or unsupported URL; no request was made.", evidence_url, when)
            continue
        if any(_is_domain_or_subdomain(domain, official) for official in official_domains):
            continue
        host_label = domain.split(".")[0]
        official_label = max((d.split(".")[0] for d in official_domains), key=len, default="")
        if official_label and _distance_one(host_label, official_label):
            add("links", "brand_domain_lookalike", config.brand_domain_lookalike,
                "Link uses a domain resembling the official brand domain",
                f"Observed host {domain} differs by one character or transposition from a configured brand domain.",
                evidence_url or raw_url, when, strength="strong")
        else:
            add("links", "unlisted_domain", config.suspicious_domain,
                "Profile or post links to an unlisted domain",
                f"Observed host {domain} is not in the brand's configured official-domain list.",
                evidence_url or raw_url, when)

    text_sources = [(f"{candidate.display_name} {candidate.bio}", candidate.profile_url, candidate.observed_at)]
    text_sources.extend((post.text, post.url, post.observed_at) for post in candidate.posts)
    for text, source_url, when in text_sources:
        for indicator, pattern in _SCAM_PATTERNS:
            match = pattern.search(text)
            if match:
                add("content", indicator, config.scam_language,
                    "Message contains a scam-associated request or offer",
                    f"Matched wording: “{match.group(0)}”. This is a screening signal, not proof of fraud.",
                    source_url, when, strength="strong")
        if _PROMO_TERMS.search(text) and has_brand_reference:
            add("content", "brand_promotion", config.promo_language,
                "Brand-related promotion or giveaway wording detected",
                "Review whether this promotion is authorized by the brand.", source_url, when)

    if candidate.avatar_similarity is not None:
        value = candidate.avatar_similarity
        if 0 <= value <= 1 and value >= 0.86:
            add("assets", "avatar_similarity", config.avatar_similarity,
                "Profile image resembles the supplied brand asset",
                f"The upstream image-analysis component reported {value:.0%} similarity against "
                f"asset {brand.official_logo_asset_id or '(asset reference not configured)' }.",
                candidate.profile_url, strength="supporting")
    if candidate.verified is True and not exact_official:
        add("metadata", "platform_verified", 4,
            "Platform verification is present but does not confirm brand affiliation",
            "Verification status is platform metadata and is not treated as proof that the account is official.",
            candidate.profile_url)

    completeness_fields = {
        "handle": bool(candidate.handle.strip()),
        "display name": bool(candidate.display_name.strip()),
        "biography": bool(candidate.bio.strip()),
        "profile URL": bool(candidate.profile_url),
        "links": bool(candidate.links),
        "posts": bool(candidate.posts),
        "verification metadata": candidate.verified is not None,
    }
    missing_fields = [name for name, present in completeness_fields.items() if not present]
    completeness = 1 - len(missing_fields) / len(completeness_fields)
    if missing_fields:
        evidence.append(Evidence(
            id=_evidence_id(candidate.id, "record_completeness", len(evidence) + 1),
            indicator="record_completeness",
            summary="Source record is incomplete",
            detail="Not supplied: " + ", ".join(missing_fields) + ". Missing data lowers confidence; it is not treated as a risk signal.",
            source_url=candidate.profile_url, observed_at=candidate.observed_at,
            strength="context",
        ))

    # A configured official handle is an exclusion for lookalike identity checks,
    # not a general trust decision: suspicious content/links still remain visible.
    points = min(100, sum(category_scores.values()))
    active_categories = tuple(sorted(category_scores))
    corroborated = len(active_categories)
    if points >= config.high_threshold and corroborated >= 3:
        severity = "high"
    elif points >= config.medium_threshold and corroborated >= 2:
        severity = "medium"
    else:
        severity = "low"
    if not evidence:
        rationale = "No configured risk indicators were found in the supplied record."
    elif severity == "low":
        rationale = "Limited or uncorroborated indicators were found; manual context may change the assessment."
    else:
        rationale = f"{corroborated} indicator categories contribute to this review priority. Validate evidence before taking action."

    source_factor = min(1.0, max(0.0, candidate.source_reliability))
    evidence_factor = min(1.0, corroborated / 3)
    confidence = round(source_factor * (0.35 + 0.65 * evidence_factor) * (0.5 + 0.5 * completeness), 2)
    assessment = RiskAssessment(points, severity, confidence, rationale, active_categories)
    category = "potential_impersonation" if any(c in active_categories for c in ("identity", "affiliation")) else "suspicious_social_activity"
    desc = f"{candidate.platform} profile {candidate.handle} has {severity} review priority based on {len(evidence)} evidence item(s)."
    return Finding(
        id=f"social:{brand.id}:{candidate.platform.casefold()}:{candidate.id}",
        brand_id=brand.id, brand_name=brand.name, affected_profile_id=candidate.id,
        platform=candidate.platform, profile_url=candidate.profile_url, category=category,
        description=desc, indicators=tuple(e.indicator for e in evidence),
        evidence=tuple(evidence), assessment=assessment, source=candidate.source,
        observed_at=candidate.observed_at,
    )
