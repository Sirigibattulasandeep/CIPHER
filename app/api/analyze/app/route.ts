import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeMobileAppCandidate, CandidateApp } from "@/lib/detection/app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, candidate, saveFinding } = body;

    if (!brandId || !candidate || !candidate.name || !candidate.packageId) {
      return NextResponse.json(
        { success: false, error: "brandId, candidate name, and packageId are required." },
        { status: 400 }
      );
    }

    const brand = db.getBrand(brandId);
    if (!brand) {
      return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
    }

    const candidateApp: CandidateApp = {
      id: candidate.id || `app-${Date.now()}`,
      name: candidate.name,
      platform: candidate.platform || "Android",
      publisherName: candidate.publisherName || "Unknown Publisher",
      packageId: candidate.packageId,
      storeUrl: candidate.storeUrl,
      marketplace: candidate.marketplace || "Third-Party APK Mirror",
      iconUrl: candidate.iconUrl,
      description: candidate.description || "",
      permissions: candidate.permissions || [],
      iconSimilarity: candidate.iconSimilarity ? Number(candidate.iconSimilarity) : undefined,
    };

    const result = analyzeMobileAppCandidate(brand, candidateApp);

    let savedFinding = null;
    if (saveFinding && result.severity !== "safe") {
      savedFinding = db.createFinding({
        orgId: brand.orgId,
        brandId: brand.id,
        brandName: brand.name,
        category: "suspicious_app",
        sourceModule: "app",
        entityType: "mobile_app",
        entityName: candidateApp.name,
        entityIdentifier: candidateApp.packageId,
        entityUrl: candidateApp.storeUrl,
        title: `Suspicious Mobile App: ${candidateApp.name}`,
        description: `Candidate app by '${candidateApp.publisherName}' flagged for publisher mismatch and package anomaly (${result.riskScore}/100).`,
        indicators: result.indicators,
        evidence: result.evidence,
        riskScore: result.riskScore,
        severity: result.severity,
        confidence: result.confidence,
        corroboratedCategories: result.corroboratedCategories,
        signalsIncreasingRisk: result.signalsIncreasingRisk,
        signalsReducingRisk: result.signalsReducingRisk,
        status: "new",
        recommendedAction: "Request marketplace removal and issue brand alert.",
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

