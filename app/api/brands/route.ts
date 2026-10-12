import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || undefined;
    const brands = db.getBrands(orgId);
    return NextResponse.json({ success: true, data: brands });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.industry) {
      return NextResponse.json(
        { success: false, error: "Brand name and industry are required." },
        { status: 400 }
      );
    }

    const newBrand = db.createBrand({
      orgId: body.orgId || "org-cipher-01",
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      industry: body.industry,
      logoUrl: body.logoUrl || "/icons/brand-default.svg",
      description: body.description || "",
      aliases: body.aliases || [],
      officialWebsites: body.officialWebsites || [],
      officialDomains: body.officialDomains || [],
      officialSocialAccounts: body.officialSocialAccounts || [],
      officialApps: body.officialApps || [],
      keywords: body.keywords || [],
      riskThresholds: body.riskThresholds || { medium: 35, high: 65, critical: 85 },
      status: "active",
    });

    return NextResponse.json({ success: true, data: newBrand }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

