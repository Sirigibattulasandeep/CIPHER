import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.text) {
      return NextResponse.json({ success: false, error: "Note text is required." }, { status: 400 });
    }

    const updated = db.addInvestigationNote(id, {
      author: body.author || "Marcus Kane",
      authorRole: body.authorRole || "Security Analyst",
      text: body.text,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Investigation not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
