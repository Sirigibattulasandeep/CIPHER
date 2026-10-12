"""Social monitoring domain logic for SENTRIX."""

from .detector import (
    BrandProfile,
    CandidateProfile,
    Evidence,
    Finding,
    OfficialAccount,
    RiskAssessment,
    SocialPost,
    analyze_candidate,
)

__all__ = [
    "BrandProfile",
    "CandidateProfile",
    "Evidence",
    "Finding",
    "OfficialAccount",
    "RiskAssessment",
    "SocialPost",
    "analyze_candidate",
]
