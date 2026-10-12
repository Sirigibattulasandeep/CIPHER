import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.title || !body.target || !body.type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (title, target, type)." },
        { status: 400 }
      );
    }

    const updated = db.addResponseAction(params.id, {
      type: body.type,
      title: body.title,
      target: body.target,
      notes: body.notes,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: "Investigation not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body.actionId || !body.status) {
      return NextResponse.json(
        { success: false, error: "actionId and status are required." },
        { status: 400 }
      );
    }

    const updated = db.updateResponseActionStatus(params.id, body.actionId, body.status);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Action or Investigation not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

