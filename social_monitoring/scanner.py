"""Import and scan candidate social records without connecting to platforms."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Iterable

from .detector import (
    BrandProfile,
    CandidateProfile,
    Finding,
    IndicatorConfig,
    RecordSource,
    SocialPost,
    analyze_candidate,
)


class ImportErrorDetail(ValueError):
    """Raised when imported JSON has an invalid top-level or row shape."""


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def candidate_from_mapping(row: dict[str, Any], *, source: RecordSource = RecordSource.IMPORTED) -> CandidateProfile:
    """Convert an imported record to the detector input shape.

    Missing profile fields are accepted to support partial exports; the scan
    remains explicit about what evidence it did and did not receive.
    """
    if not isinstance(row, dict):
        raise ImportErrorDetail("Each candidate record must be a JSON object.")
    platform = str(row.get("platform") or "Unknown").strip() or "Unknown"
    handle = str(row.get("handle") or "").strip()
    raw_id = row.get("id")
    if raw_id is None:
        stable_input = f"{platform.casefold()}|{handle.casefold()}|{row.get('profile_url', '')}"
        raw_id = hashlib.sha256(stable_input.encode("utf-8")).hexdigest()[:16]

    raw_posts = row.get("posts") or []
    if not isinstance(raw_posts, list):
        raise ImportErrorDetail("The 'posts' field must be a list.")
    posts = []
    for post in raw_posts:
        if not isinstance(post, dict):
            raise ImportErrorDetail("Each post must be a JSON object.")
        posts.append(SocialPost(
            text=str(post.get("text") or ""),
            url=str(post["url"]) if post.get("url") else None,
            post_id=str(post["id"]) if post.get("id") is not None else None,
            observed_at=_parse_datetime(post.get("observed_at")),
        ))

    links = row.get("links") or []
    if isinstance(links, str):
        links = [links]
    if not isinstance(links, list):
        raise ImportErrorDetail("The 'links' field must be a list of URLs.")
    reliability = row.get("source_reliability", 0.75)
    try:
        reliability = float(reliability)
    except (TypeError, ValueError):
        reliability = 0.0

    avatar_similarity = row.get("avatar_similarity")
    try:
        avatar_similarity = float(avatar_similarity) if avatar_similarity is not None else None
    except (TypeError, ValueError):
        avatar_similarity = None
    created = _parse_datetime(row.get("account_created_at"))
    observed = _parse_datetime(row.get("observed_at")) or datetime.now(timezone.utc)
    verified_value = row.get("verified")
    verified = verified_value if isinstance(verified_value, bool) else None
    return CandidateProfile(
        id=str(raw_id), platform=platform, handle=handle,
        display_name=str(row.get("display_name") or ""), bio=str(row.get("bio") or ""),
        profile_url=str(row["profile_url"]) if row.get("profile_url") else None,
        links=tuple(str(link) for link in links if link), posts=tuple(posts),
        verified=verified, account_created_at=created,
        avatar_similarity=avatar_similarity, source=source,
        source_reliability=reliability, observed_at=observed,
    )


def parse_imported_json(contents: str) -> list[CandidateProfile]:
    """Parse a JSON array or an object containing a `profiles` array."""
    try:
        payload = json.loads(contents)
    except json.JSONDecodeError as exc:
        raise ImportErrorDetail(f"Invalid JSON at line {exc.lineno}, column {exc.colno}.") from exc
    if isinstance(payload, dict):
        payload = payload.get("profiles")
    if not isinstance(payload, list):
        raise ImportErrorDetail("Import must be a JSON array or an object with a 'profiles' array.")
    return [candidate_from_mapping(row, source=RecordSource.IMPORTED) for row in payload]


def scan_candidates(
    brand: BrandProfile,
    candidates: Iterable[CandidateProfile],
    config: IndicatorConfig | None = None,
) -> list[Finding]:
    """Analyze a batch using the same selected brand for every candidate."""
    if config is None:
        return [analyze_candidate(brand, candidate) for candidate in candidates]
    return [analyze_candidate(brand, candidate, config) for candidate in candidates]


def filter_findings(
    findings: Iterable[Finding], *, platform: str | None = None,
    source: RecordSource | None = None, severity: str | None = None,
    query: str | None = None,
) -> list[Finding]:
    """Filter actual finding records for an overview or investigation list."""
    result = list(findings)
    if platform:
        result = [f for f in result if f.platform.casefold() == platform.casefold()]
    if source:
        result = [f for f in result if f.source == source]
    if severity:
        result = [f for f in result if f.assessment.severity == severity.casefold()]
    if query and query.strip():
        needle = query.strip().casefold()
        result = [f for f in result if needle in " ".join((
            f.brand_name, f.affected_profile_id, f.platform, f.description,
            *(e.summary + " " + e.detail for e in f.evidence),
        )).casefold()]
    return result


def demo_candidates() -> list[CandidateProfile]:
    """A small, clearly simulated dataset for interface and workflow demos."""
    now = datetime.now(timezone.utc)
    return [
        CandidateProfile(
            id="demo-support-001", platform="DemoSocial", handle="@northstar_help24",
            display_name="Northstar Official Support", bio="Claim your prize after paying a processing fee.",
            profile_url="https://social.example/northstar_help24",
            links=("https://northstarr.example.invalid",),
            posts=(SocialPost("Claim your prize by paying a processing fee.",
                              "https://social.example/post/demo-1", "demo-post-1", now),),
            avatar_similarity=0.91, source=RecordSource.DEMO, source_reliability=0.6,
            observed_at=now,
        ),
        CandidateProfile(
            id="demo-fan-001", platform="DemoSocial", handle="@northstar_fan_club",
            display_name="Northstar Fan Club", bio="Unofficial community for fans.",
            profile_url="https://social.example/northstar_fan_club",
            source=RecordSource.DEMO, source_reliability=0.6, observed_at=now,
        ),
    ]
