"""Explainable screening for possible brand-impersonating store listings."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import re

from .detector import (
    BrandProfile,
    Evidence,
    Finding,
    FindingStatus,
    RecordSource,
    RiskAssessment,
    _SCAM_PATTERNS,
    _domain,
    _distance_one,
    _evidence_id,
    _is_domain_or_subdomain,
    normalize_name,
    similarity,
    DEFAULT_CONFIG,
)


@dataclass(frozen=True)
class AppCandidate:
    id: str
    store: str
    app_id: str
    name: str
    publisher: str = ""
    description: str = ""
    store_url: str | None = None
    links: tuple[str, ...] = ()
    logo_similarity: float | None = None
    source: RecordSource = RecordSource.IMPORTED
    source_reliability: float = 0.75
    observed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class AppIndicatorConfig:
    name_similarity: int = 22
    brand_name_reference: int = 10
    publisher_mismatch: int = 24
    description_similarity: int = 18
    official_claim: int = 14
    suspicious_description: int = 24
    suspicious_domain: int = 22
    brand_domain_lookalike: int = 24
    logo_similarity: int = 22
    medium_threshold: int = DEFAULT_CONFIG.medium_threshold
    high_threshold: int = DEFAULT_CONFIG.high_threshold


APP_CONFIG = AppIndicatorConfig()
_WORD = re.compile(r"[a-z0-9]+")
_URL = re.compile(r"https?://[^\s)\]}>,]+", re.I)
_OFFICIAL_CLAIM = re.compile(r"\b(?:official|authorized|authorised|verified partner|brand team)\b", re.I)
_STOP_WORDS = {"the", "and", "for", "with", "from", "your", "our", "app", "mobile", "official"}


def _description_similarity(first: str, second: str) -> float:
    left = {word for word in _WORD.findall(first.casefold()) if word not in _STOP_WORDS}
    right = {word for word in _WORD.findall(second.casefold()) if word not in _STOP_WORDS}
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _same_publisher(candidate: str, official: str | None) -> bool:
    if not candidate.strip() or not official or not official.strip():
        return False
    return normalize_name(candidate) == normalize_name(official)


def _app_name_similarity(reference: str, candidate: str) -> float:
    base = similarity(reference, candidate)
    reference_words = [word for word in _WORD.findall(reference.casefold()) if word not in _STOP_WORDS]
    candidate_words = [word for word in _WORD.findall(candidate.casefold()) if word not in _STOP_WORDS]
    # Give a modest, non-exact bump to genuine title expansions such as
    # "Northstar Banking" -> "Northstar Banking Support". Single-word brand
    # matches do not get this bump, which limits common-name false positives.
    if len(reference_words) >= 2 and all(word in candidate_words for word in reference_words):
        base = max(base, 0.86)
    return base


def _is_official_listing(brand: BrandProfile, candidate: AppCandidate) -> bool:
    store, app_id = candidate.store.casefold().strip(), candidate.app_id.casefold().strip()
    return any(app.store.casefold().strip() == store and app.app_id.casefold().strip() == app_id
               for app in brand.official_apps if app_id)


def analyze_app_candidate(
    brand: BrandProfile,
    candidate: AppCandidate,
    config: AppIndicatorConfig = APP_CONFIG,
) -> Finding:
    """Analyze one imported/connected/demo listing; no store request is made."""
    evidence: list[Evidence] = []
    category_scores: dict[str, int] = {}

    def add(category: str, indicator: str, points: int, summary: str, detail: str,
            *, url: str | None = None, strength: str = "supporting") -> None:
        category_scores[category] = max(category_scores.get(category, 0), points)
        evidence.append(Evidence(
            id=_evidence_id(candidate.id, indicator, len(evidence) + 1),
            indicator=indicator, summary=summary, detail=detail,
            source_url=url or candidate.store_url, observed_at=candidate.observed_at,
            strength=strength,
        ))

    official_listing = _is_official_listing(brand, candidate)
    official_apps = [app for app in brand.official_apps
                     if app.store.casefold().strip() == candidate.store.casefold().strip()]
    is_official_publisher = any(_same_publisher(candidate.publisher, app.publisher) for app in official_apps)
    compared_names = [app.name for app in official_apps] or [brand.name, *brand.aliases]
    best_name, best_name_score = max(
        ((name, _app_name_similarity(name, candidate.name)) for name in compared_names),
        key=lambda pair: pair[1], default=(brand.name, 0.0),
    )
    normalized_candidate = normalize_name(candidate.name)
    brand_names = (brand.name,) + brand.aliases
    has_brand_reference = any(normalize_name(name) and normalize_name(name) in normalized_candidate
                              for name in brand_names)

    if not official_listing:
        if best_name_score >= 0.84:
            add("identity", "app_name_similarity", config.name_similarity,
                "App name closely resembles a configured brand app",
                f"Name similarity to “{best_name}” is {best_name_score:.0%}; added words and spacing are normalized.",
                strength="strong" if best_name_score >= 0.94 else "supporting")
        elif has_brand_reference:
            add("identity", "brand_name_reference", config.brand_name_reference,
                "App name contains a brand name or alias",
                "A brand name appears in the listing name; this alone is a weak signal and remains low priority.")

        if has_brand_reference and _OFFICIAL_CLAIM.search(candidate.name + " " + candidate.description):
            add("affiliation", "official_affiliation_claim", config.official_claim,
                "Listing claims an official or authorized affiliation",
                "The store listing uses official-style wording, but the listing is not in the configured official-app list.")

        if best_name_score >= 0.70 and official_apps and not is_official_publisher:
            publishers = sorted({app.publisher for app in official_apps if app.publisher})
            expected = ", ".join(publishers) if publishers else "the configured official publisher"
            add("publisher", "publisher_mismatch", config.publisher_mismatch,
                "Similar app has a different publisher",
                f"Observed publisher “{candidate.publisher or 'not provided'}”; configured publisher: {expected}.",
                strength="strong")

    description_scores = [(_description_similarity(app.description, candidate.description), app)
                          for app in official_apps if app.description and candidate.description]
    best_description, source_app = max(description_scores, key=lambda pair: pair[0], default=(0.0, None))
    if not official_listing and best_description >= 0.48 and has_brand_reference:
        add("content", "description_similarity", config.description_similarity,
            "App description resembles an official product description",
            f"Description token overlap with “{source_app.name}” is {best_description:.0%}.")

    for indicator, pattern in _SCAM_PATTERNS:
        match = pattern.search(candidate.description)
        if match:
            add("content", indicator, config.suspicious_description,
                "App description contains scam-associated wording",
                f"Matched wording: “{match.group(0)}”. Review this claim and the app's behavior before acting.",
                strength="strong")

    if candidate.logo_similarity is not None and 0 <= candidate.logo_similarity <= 1 and candidate.logo_similarity >= 0.86:
        add("assets", "logo_similarity", config.logo_similarity,
            "App icon resembles the supplied brand logo",
            f"The upstream image-analysis component reported {candidate.logo_similarity:.0%} similarity against "
            f"asset {brand.official_logo_asset_id or '(asset reference not configured)' }.")

    official_domains = tuple(filter(None, (_domain(domain) for domain in brand.official_domains)))
    listing_links = list(candidate.links) + _URL.findall(candidate.description)
    for raw_url in dict.fromkeys(listing_links):
        domain = _domain(raw_url)
        if not domain:
            add("links", "invalid_url", 8, "A listing link could not be safely parsed",
                "The supplied URL is malformed or unsupported; the scanner did not open it.", url=candidate.store_url)
            continue
        if any(_is_domain_or_subdomain(domain, official) for official in official_domains):
            continue
        first_label = domain.split(".")[0]
        official_label = max((d.split(".")[0] for d in official_domains), key=len, default="")
        if official_label and _distance_one(first_label, official_label):
            add("links", "brand_domain_lookalike", config.brand_domain_lookalike,
                "Listing links to a domain resembling the official brand domain",
                f"Observed host {domain} differs by one character or transposition from a configured brand domain.",
                url=raw_url, strength="strong")
        else:
            add("links", "unlisted_domain", config.suspicious_domain,
                "Listing links to a domain not configured as official",
                f"Observed host {domain} is not listed as an official brand domain.",
                url=raw_url)

    # Missing fields lower confidence but do not add risk points.
    fields = (candidate.app_id, candidate.name, candidate.publisher, candidate.description,
              candidate.store_url, candidate.logo_similarity)
    completeness = sum(value is not None and value != "" for value in fields) / len(fields)
    if completeness < 1:
        missing = [name for name, value in zip(
            ("store listing ID", "app name", "publisher", "description", "store URL", "logo analysis"), fields
        ) if value is None or value == ""]
        evidence.append(Evidence(
            id=_evidence_id(candidate.id, "record_completeness", len(evidence) + 1),
            indicator="record_completeness", summary="Store record is incomplete",
            detail="Not supplied: " + ", ".join(missing) + ". Missing fields lower confidence and are not risk signals.",
            source_url=candidate.store_url, observed_at=candidate.observed_at, strength="context",
        ))

    score = min(100, sum(category_scores.values()))
    category_count = len(category_scores)
    if score >= config.high_threshold and category_count >= 3:
        severity = "high"
    elif score >= config.medium_threshold and category_count >= 2:
        severity = "medium"
    else:
        severity = "low"
    source_factor = min(1.0, max(0.0, candidate.source_reliability))
    corroboration_factor = min(1.0, category_count / 3)
    confidence = round(source_factor * (0.35 + 0.65 * corroboration_factor) * (0.5 + 0.5 * completeness), 2)
    rationale = ("No configured app risk indicators were found." if not category_scores else
                 "Limited or uncorroborated indicators were found; manually review the listing context." if severity == "low" else
                 f"{category_count} indicator categories contribute to this review priority; verify them before action.")
    assessment = RiskAssessment(score, severity, confidence, rationale, tuple(sorted(category_scores)))
    finding_category = "potential_app_impersonation" if any(c in category_scores for c in ("identity", "affiliation", "publisher")) else "suspicious_app_activity"
    description = f"{candidate.store} listing “{candidate.name or 'Unnamed app'}” has {severity} review priority based on {len(evidence)} evidence item(s)."
    return Finding(
        id=f"app:{brand.id}:{candidate.store.casefold()}:{candidate.id}",
        brand_id=brand.id, brand_name=brand.name, affected_profile_id=None,
        affected_asset_id=candidate.id, asset_type="mobile_app", platform=candidate.store,
        profile_url=candidate.store_url, category=finding_category, description=description,
        indicators=tuple(item.indicator for item in evidence), evidence=tuple(evidence),
        assessment=assessment, source=candidate.source, observed_at=candidate.observed_at,
        status=FindingStatus.OPEN,
    )


def scan_app_candidates(brand: BrandProfile, candidates: list[AppCandidate],
                        config: AppIndicatorConfig = APP_CONFIG) -> list[Finding]:
    """Analyze a batch of imported or connector-provided store records."""
    return [analyze_app_candidate(brand, candidate, config) for candidate in candidates]
