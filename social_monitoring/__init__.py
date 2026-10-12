"""Social monitoring domain logic for SENTRIX."""

from .app_detector import AppCandidate, analyze_app_candidate, scan_app_candidates
from .detector import (
    BrandProfile,
    CandidateProfile,
    Evidence,
    Finding,
    OfficialApp,
    OfficialAccount,
    RiskAssessment,
    SocialPost,
    analyze_candidate,
)

__all__ = [
    "AppCandidate",
    "BrandProfile",
    "CandidateProfile",
    "Evidence",
    "Finding",
    "OfficialApp",
    "OfficialAccount",
    "RiskAssessment",
    "SocialPost",
    "analyze_candidate",
    "analyze_app_candidate",
    "scan_app_candidates",
]
