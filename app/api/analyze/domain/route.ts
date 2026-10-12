import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  analyzeDomainCandidate,
  generateTyposquatCandidates,
} from "@/lib/detection/domain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId, urlOrDomain, saveFinding, generateTyposquats } = body;

    if (!brandId || !urlOrDomain) {
      return NextResponse.json(
        { success: false, error: "brandId and urlOrDomain are required." },
        { status: 400 }
      );
    }

    const brand = db.getBrand(brandId);
    if (!brand) {
      return NextResponse.json({ success: false, error: "Brand not found." }, { status: 404 });
    }

    const result = analyzeDomainCandidate(brand, urlOrDomain);

    let typosquats = undefined;
    if (generateTyposquats && brand.officialDomains.length > 0) {
      typosquats = generateTyposquatCandidates(brand.officialDomains[0]);
    }

    let savedFinding = null;
    if (saveFinding && result.severity !== "safe") {
      savedFinding = db.createFinding({
        orgId: brand.orgId,
        brandId: brand.id,
        brandName: brand.name,
        category: result.category,
        sourceModule: "domain",
        entityType: urlOrDomain.includes("/") ? "url" : "domain",
        entityName: urlOrDomain,
        entityIdentifier: `domain-${Date.now()}`,
        entityUrl: urlOrDomain.startsWith("http") ? urlOrDomain : `https://${urlOrDomain}`,
        title: `${result.category === "phishing" ? "Phishing Threat" : "Lookalike Domain"}: ${urlOrDomain}`,
        description: `Candidate domain flagged with ${result.severity.toUpperCase()} priority (${result.riskScore}/100).`,
        indicators: result.indicators,
        evidence: result.evidence,
        riskScore: result.riskScore,
        severity: result.severity,
        confidence: result.confidence,
        corroboratedCategories: result.corroboratedCategories,
        signalsIncreasingRisk: result.signalsIncreasingRisk,
        signalsReducingRisk: result.signalsReducingRisk,
        status: "new",
        recommendedAction: "Submit registrar abuse notice and safe browsing block request.",
      });
    }

    return NextResponse.json({
      success: true,
      analysis: result,
      typosquats,
      savedFinding,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

