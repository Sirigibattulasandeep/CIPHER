import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateIncidentSummary } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { findingId, findingData } = body;

    let targetFinding = findingData;
    if (findingId) {
      targetFinding = db.getFinding(findingId);
    }

    if (!targetFinding) {
      return NextResponse.json(
        { success: false, error: "Finding not found or findingData missing." },
        { status: 404 }
      );
    }

    const summaryResponse = await generateIncidentSummary(targetFinding);

    // If finding exists in DB, update it with AI summary
    if (findingId) {
      db.updateFinding(findingId, {
        aiSummary: summaryResponse.summary,
      });
    }

    return NextResponse.json({
      success: true,
      data: summaryResponse,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

