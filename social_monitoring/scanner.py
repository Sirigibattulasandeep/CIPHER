"""Import and scan candidate social records without connecting to platforms."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from typing import Any, Iterable

from .app_detector import AppCandidate
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


def app_candidate_from_mapping(
    row: dict[str, Any], *, source: RecordSource = RecordSource.IMPORTED,
) -> AppCandidate:
    """Convert one app-store export row to the app detector input shape."""
    if not isinstance(row, dict):
        raise ImportErrorDetail("Each app record must be a JSON object.")
    store = str(row.get("store") or row.get("platform") or "Unknown").strip() or "Unknown"
    app_id = str(row.get("app_id") or row.get("package_name") or "").strip()
    name = str(row.get("name") or row.get("app_name") or "").strip()
    raw_id = row.get("id")
    if raw_id is None:
        stable_input = f"{store.casefold()}|{app_id.casefold()}|{name.casefold()}|{row.get('store_url', '')}"
        raw_id = hashlib.sha256(stable_input.encode("utf-8")).hexdigest()[:16]
    links = row.get("links") or []
    if isinstance(links, str):
        links = [links]
    if not isinstance(links, list):
        raise ImportErrorDetail("App 'links' must be a list of URLs.")
    try:
        reliability = float(row.get("source_reliability", 0.75))
    except (TypeError, ValueError):
        reliability = 0.0
    logo_similarity = row.get("logo_similarity")
    try:
        logo_similarity = float(logo_similarity) if logo_similarity is not None else None
    except (TypeError, ValueError):
        logo_similarity = None
    return AppCandidate(
        id=str(raw_id), store=store, app_id=app_id, name=name,
        publisher=str(row.get("publisher") or ""),
        description=str(row.get("description") or ""),
        store_url=str(row["store_url"]) if row.get("store_url") else None,
        links=tuple(str(link) for link in links if link),
        logo_similarity=logo_similarity, source=source,
        source_reliability=reliability,
        observed_at=_parse_datetime(row.get("observed_at")) or datetime.now(timezone.utc),
    )


def parse_imported_apps_json(contents: str) -> list[AppCandidate]:
    """Parse an app array or an object containing an `apps` array."""
    try:
        payload = json.loads(contents)
    except json.JSONDecodeError as exc:
        raise ImportErrorDetail(f"Invalid JSON at line {exc.lineno}, column {exc.colno}.") from exc
    if isinstance(payload, dict):
        payload = payload.get("apps")
    if not isinstance(payload, list):
        raise ImportErrorDetail("App import must be an array or an object with an 'apps' array.")
    return [app_candidate_from_mapping(row, source=RecordSource.IMPORTED) for row in payload]


def demo_app_candidates() -> list[AppCandidate]:
    """Simulated app listings for scanner demos; never label as live threats."""
    now = datetime.now(timezone.utc)
    return [
        AppCandidate(
            id="demo-official-app", store="DemoStore", app_id="com.northstar.bank",
            name="Northstar Banking", publisher="Northstar Labs",
            description="Manage your Northstar account and banking services.",
            store_url="https://store.example/demo-official-app",
            source=RecordSource.DEMO, source_reliability=0.6, observed_at=now,
        ),
        AppCandidate(
            id="demo-lookalike-app", store="DemoStore", app_id="com.example.northstarr.support",
            name="Northstar Banking Support", publisher="Unknown Publisher",
            description="Official Northstar support. Claim your prize by paying a processing fee.",
            store_url="https://store.example/demo-lookalike-app",
            links=("https://northstarr.example.invalid/login",), logo_similarity=0.92,
            source=RecordSource.DEMO, source_reliability=0.6, observed_at=now,
        ),
        AppCandidate(
            id="demo-unrelated-app", store="DemoStore", app_id="com.example.stargazer",
            name="Stargazer Sky Guide", publisher="Open Sky Apps",
            description="Explore constellations and learn astronomy.",
            store_url="https://store.example/demo-unrelated-app",
            source=RecordSource.DEMO, source_reliability=0.6, observed_at=now,
        ),
    ]


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
