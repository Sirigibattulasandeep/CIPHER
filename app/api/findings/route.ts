import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || undefined;
    const category = searchParams.get("category") || undefined;
    const sourceModule = searchParams.get("sourceModule") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;
    const query = searchParams.get("q") || undefined;

    const findings = db.getFindings({
      brandId,
      category,
      sourceModule,
      severity,
      status,
      query,
    });

    return NextResponse.json({ success: true, count: findings.length, data: findings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.brandId || !body.title || !body.entityName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (brandId, title, entityName)." },
        { status: 400 }
      );
    }

    const brand = db.getBrand(body.brandId);

    const newFinding = db.createFinding({
      orgId: body.orgId || "org-cipher-01",
      brandId: body.brandId,
      brandName: brand ? brand.name : body.brandName || "Unknown Brand",
      category: body.category || "potential_impersonation",
      sourceModule: body.sourceModule || "social",
      entityType: body.entityType || "social_profile",
      entityName: body.entityName,
      entityIdentifier: body.entityIdentifier || `entity-${Date.now()}`,
      entityUrl: body.entityUrl,
      title: body.title,
      description: body.description || "",
      indicators: body.indicators || [],
      evidence: body.evidence || [],
      riskScore: body.riskScore ?? 50,
      severity: body.severity || "medium",
      confidence: body.confidence ?? 80,
      corroboratedCategories: body.corroboratedCategories || ["identity"],
      signalsIncreasingRisk: body.signalsIncreasingRisk || [],
      signalsReducingRisk: body.signalsReducingRisk || [],
      status: body.status || "new",
      assignedAnalyst: body.assignedAnalyst,
      aiSummary: body.aiSummary,
      recommendedAction: body.recommendedAction || "Review evidence and assign to analyst.",
      isSimulated: body.isSimulated ?? false,
    });

    return NextResponse.json({ success: true, data: newFinding }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

