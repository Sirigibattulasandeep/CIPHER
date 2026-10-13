import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const inv = db.getInvestigation(id);
    if (!inv) {
      return NextResponse.json({ success: false, error: "Investigation not found." }, { status: 404 });
    }
    // Also attach full linked findings
    const linkedFindings = inv.findingIds
      .map((fid) => db.getFinding(fid))
      .filter(Boolean);

    return NextResponse.json({ success: true, data: { ...inv, linkedFindings } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = db.updateInvestigation(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Investigation not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
