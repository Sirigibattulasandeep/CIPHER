import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const finding = db.getFinding(params.id);
    if (!finding) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: finding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = db.updateFinding(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = db.deleteFinding(params.id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Finding deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

