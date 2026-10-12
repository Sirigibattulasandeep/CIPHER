import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || undefined;

    const findings = db.getFindings({ brandId: brandId === "all" ? undefined : brandId });
    const investigations = db.getInvestigations({ brandId: brandId === "all" ? undefined : brandId });
    const brands = db.getBrands();

    // Severity Breakdown
    const severityCounts = {
      critical: findings.filter((f) => f.severity === "critical").length,
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      low: findings.filter((f) => f.severity === "low").length,
    };

    // Status Breakdown
    const statusCounts = {
      new: findings.filter((f) => f.status === "new").length,
      investigating: findings.filter((f) => f.status === "investigating").length,
      confirmed_threat: findings.filter((f) => f.status === "confirmed_threat").length,
      false_positive: findings.filter((f) => f.status === "false_positive").length,
      resolved: findings.filter((f) => f.status === "resolved").length,
    };

    // Category Distribution
    const categoryMap: Record<string, number> = {};
    findings.forEach((f) => {
      const cat = f.category.replace(/_/g, " ");
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Module / Platform Distribution
    const moduleMap: Record<string, number> = {};
    findings.forEach((f) => {
      const mod = f.sourceModule.toUpperCase();
      moduleMap[mod] = (moduleMap[mod] || 0) + 1;
    });
    const moduleData = Object.entries(moduleMap).map(([name, value]) => ({
      name,
      value,
    }));

    // 7-day Trend Velocity (simulated grouped by day for realistic visualization)
    const trendData = [
      { date: "Day -6", critical: 1, high: 2, total: 3 },
      { date: "Day -5", critical: 2, high: 1, total: 4 },
      { date: "Day -4", critical: 1, high: 3, total: 5 },
      { date: "Day -3", critical: 3, high: 2, total: 6 },
      { date: "Day -2", critical: 4, high: 3, total: 8 },
      { date: "Yesterday", critical: 2, high: 4, total: 7 },
      {
        date: "Today",
        critical: severityCounts.critical,
        high: severityCounts.high,
        total: findings.length,
      },
    ];

    // Response Action Stats
    let totalActions = 0;
    let completedActions = 0;
    investigations.forEach((inv) => {
      totalActions += inv.responseActions.length;
      completedActions += inv.responseActions.filter((a) => a.status === "completed").length;
    });

    const metrics = {
      totalFindings: findings.length,
      criticalFindings: severityCounts.critical,
      highFindings: severityCounts.high,
      openInvestigations: investigations.filter((i) => i.status !== "resolved").length,
      confirmedThreats: statusCounts.confirmed_threat,
      falsePositives: statusCounts.false_positive,
      resolvedCases: statusCounts.resolved,
      activeResponseActions: totalActions,
      completedResponseActions: completedActions,
      severityCounts,
      statusCounts,
      categoryData,
      moduleData,
      trendData,
      totalBrandsMonitored: brands.length,
    };

    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

