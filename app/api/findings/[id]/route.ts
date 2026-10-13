import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const finding = db.getFinding(id);
    if (!finding) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: finding });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = db.updateFinding(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deleted = db.deleteFinding(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Finding not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Finding deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
