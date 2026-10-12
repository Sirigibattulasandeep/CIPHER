import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeSocialCandidate, CandidateSocialProfile } from "@/lib/detection/social";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, candidate, saveFinding } = body;

    if (!brandId || !candidate || !candidate.handle) {
      return NextResponse.json(
        { success: false, error: "brandId and candidate with handle are required." },
        { status: 400 }
      );
    }

    const brand = db.getBrand(brandId);
    if (!brand) {
      return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
    }

    const candidateProfile: CandidateSocialProfile = {
      id: candidate.id || `candidate-${Date.now()}`,
      platform: candidate.platform || "Twitter/X",
      handle: candidate.handle,
      displayName: candidate.displayName || candidate.handle,
      bio: candidate.bio || "",
      profileUrl: candidate.profileUrl,
      avatarSimilarity: candidate.avatarSimilarity ? Number(candidate.avatarSimilarity) : undefined,
      links: candidate.links || [],
      posts: candidate.posts || [],
      verified: candidate.verified,
      sourceReliability: candidate.sourceReliability ?? 0.8,
    };

    const result = analyzeSocialCandidate(brand, candidateProfile);

    let savedFinding = null;
    if (saveFinding && result.severity !== "safe") {
      savedFinding = db.createFinding({
        orgId: brand.orgId,
        brandId: brand.id,
        brandName: brand.name,
        category: result.category,
        sourceModule: "social",
        entityType: "social_profile",
        entityName: candidateProfile.handle,
        entityIdentifier: candidateProfile.id,
        entityUrl: candidateProfile.profileUrl,
        title: `${candidateProfile.platform} Impersonation: ${candidateProfile.displayName}`,
        description: `Candidate profile '${candidateProfile.handle}' flagged with ${result.severity.toUpperCase()} priority (${result.riskScore}/100).`,
        indicators: result.indicators,
        evidence: result.evidence,
        riskScore: result.riskScore,
        severity: result.severity,
        confidence: result.confidence,
        corroboratedCategories: result.corroboratedCategories,
        signalsIncreasingRisk: result.signalsIncreasingRisk,
        signalsReducingRisk: result.signalsReducingRisk,
        status: "new",
        recommendedAction: `File platform abuse report with ${candidateProfile.platform} trust & safety.`,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      savedFinding,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

