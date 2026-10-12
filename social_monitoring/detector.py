
"""SENTRIX by CIPHER — Social Account Risk Detector.

This prototype uses demo account data. It does not connect to social
platforms or prove that any account is fraudulent.
"""

from dataclasses import dataclass, field
from difflib import SequenceMatcher
import re
import unicodedata
from urllib.parse import urlparse


@dataclass
class BrandProfile:
    name: str
    official_handles: list[str] = field(default_factory=list)
    official_domains: list[str] = field(default_factory=list)


@dataclass
class SocialAccount:
    platform: str
    handle: str
    display_name: str
    bio: str = ""
    urls: list[str] = field(default_factory=list)
    logo_similarity: float | None = None
    verified: bool = False


def normalize_name(value: str) -> str:
    """Normalize names for comparison."""
    value = unicodedata.normalize("NFKC", value).casefold()
    value = "".join(
        char
        for char in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(char)
    )
    return "".join(char for char in value if char.isalnum())


def name_similarity(first: str, second: str) -> float:
    """Return a basic similarity ratio from 0.0 to 1.0."""
    first = normalize_name(first)
    second = normalize_name(second)

    if not first or not second:
        return 0.0

    return SequenceMatcher(None, first, second).ratio()


def safe_external_domain(url: str) -> str | None:
    """Parse a URL without making a network request."""
    try:
        parsed = urlparse(url.strip())

        if parsed.scheme.lower() not in {"http", "https"}:
            return None

        if not parsed.hostname or parsed.username or parsed.password:
            return None

        return parsed.hostname.rstrip(".").lower()

    except (ValueError, AttributeError):
        return None


def domain_matches_official(domain: str, official_domain: str) -> bool:
    """Match an official domain or its true subdomains."""
    domain = domain.casefold().rstrip(".")
    official_domain = official_domain.casefold().rstrip(".")

    return (
        domain == official_domain
        or domain.endswith("." + official_domain)
    )


def assess_account(brand: BrandProfile, account: SocialAccount) -> dict:
    """Score risk indicators and return explanations."""

    score = 0
    evidence = []

    brand_name = normalize_name(brand.name)
    normalized_handle = normalize_name(account.handle.lstrip("@"))
    normalized_display_name = normalize_name(account.display_name)

    official_handles = {
        normalize_name(handle.lstrip("@"))
        for handle in brand.official_handles
    }

    # An exact listed official handle is excluded from name-based scoring.
    # This does not independently verify the account's authenticity.
    is_listed_official_handle = normalized_handle in official_handles

    if is_listed_official_handle:
        evidence.append(
            "Handle matches the brand's configured official-handle list."
        )
    else:
        similarities = [
            name_similarity(brand.name, account.display_name),
            name_similarity(brand.name, account.handle.lstrip("@")),
        ]
        strongest_similarity = max(similarities, default=0.0)

        if strongest_similarity >= 0.90:
            score += 35
            evidence.append(
                "Account name is extremely similar to the brand."
            )
        elif strongest_similarity >= 0.75:
            score += 24
            evidence.append(
                "Account name closely resembles the brand."
            )
        elif strongest_similarity >= 0.55:
            score += 10
            evidence.append(
                "Account name has some similarity to the brand."
            )

        # Check for brand-like names with extra support-style terms.
        suspicious_terms = (
            "official",
            "support",
            "helpdesk",
            "customer",
            "service",
            "security",
            "claims",
            "rewards",
        )

        normalized_names = [
            normalized_display_name,
            normalized_handle,
        ]

        has_brand_fragment = any(
            brand_name and brand_name in name
            for name in normalized_names
        )

        has_extra_term = any(
            any(
                term in name and name != brand_name
                for term in suspicious_terms
            )
            for name in normalized_names
        )

        if has_brand_fragment and has_extra_term:
            score += 15
            evidence.append(
                "Brand-like name includes support or official-style wording."
            )

    # Analyze supplied URLs without opening or fetching them.
    official_domains = [
        domain.lower().rstrip(".")
        for domain in brand.official_domains
    ]

    external_domains = []

    for url in account.urls:
        domain = safe_external_domain(url)

        if domain is None:
            score += 5
            evidence.append(
                "A supplied URL is malformed or uses an unsupported scheme."
            )
            continue

        is_official_domain = any(
            domain_matches_official(domain, official)
            for official in official_domains
        )

        if not is_official_domain:
            external_domains.append(domain)

    if external_domains:
        score += 15
        evidence.append(
            "Profile links to a domain not listed as official."
        )

    # Common scam phrases are risk indicators, not proof.
    profile_text = (
        f"{account.display_name} {account.bio}"
    ).casefold()

    scam_patterns = [
        r"\bpay\s+(?:a\s+)?processing\s+fee\b",
        r"\bclaim\s+your\s+prize\b",
        r"\bguaranteed\s+returns\b",
        r"\bsend\s+(?:us\s+)?your\s+otp\b",
        r"\bshare\s+your\s+password\b",
        r"\bpay\s+to\s+verify\b",
    ]

    if any(
        re.search(pattern, profile_text)
        for pattern in scam_patterns
    ):
        score += 25
        evidence.append(
            "Profile text contains wording associated with scam tactics."
        )

    # Logo similarity must be supplied by another analysis component.
    if account.logo_similarity is not None:
        similarity = account.logo_similarity

        if 0.0 <= similarity <= 1.0:
            if similarity >= 0.90:
                score += 25
                evidence.append(
                    "Profile image strongly resembles the reference logo."
                )
            elif similarity >= 0.75:
                score += 15
                evidence.append(
                    "Profile image moderately resembles the reference logo."
                )
        else:
            evidence.append(
                "Logo similarity value is outside the valid range."
            )

    score = min(score, 100)

    if score >= 70:
        risk_level = "high"
    elif score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    if not evidence:
        evidence.append(
            "No configured risk indicators were detected."
        )

    return {
        "platform": account.platform,
        "handle": account.handle,
        "display_name": account.display_name,
        "risk_score": score,
        "risk_level": risk_level,
        "evidence": evidence,
        "review_required": score >= 40,
        "decision_note": (
            "Heuristic screening only. Review evidence before taking action."
        ),
    }


def demo():
    """Run sample accounts through the detector."""

    brand = BrandProfile(
        name="Northstar",
        official_handles=["@northstar"],
        official_domains=["northstar.example"],
    )

    accounts = [
        SocialAccount(
            platform="DemoSocial",
            handle="@northstar",
            display_name="Northstar",
            urls=["https://northstar.example"],
        ),
        SocialAccount(
            platform="DemoSocial",
            handle="@northstar_support24",
            display_name="Northstar Official Support",
            bio="Claim your prize after paying a processing fee.",
            urls=["https://northstar-rewards.example"],
            logo_similarity=0.94,
        ),
        SocialAccount(
            platform="DemoSocial",
            handle="@northstar_fan_club",
            display_name="Northstar Fan Club",
        ),
    ]

    for account in accounts:
        result = assess_account(brand, account)

        print(
            f"\n{result['display_name']} ({result['handle']})"
        )
        print(
            f"Risk: {result['risk_level']} "
            f"— {result['risk_score']}/100"
        )

        for reason in result["evidence"]:
            print(f"  - {reason}")

        print(f"Review required: {result['review_required']}")


if __name__ == "__main__":
    demo()
