import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || undefined;
    const status = searchParams.get("status") || undefined;
    const query = searchParams.get("q") || undefined;

    const investigations = db.getInvestigations({ brandId, status, query });
    return NextResponse.json({ success: true, count: investigations.length, data: investigations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.brandId) {
      return NextResponse.json(
        { success: false, error: "Title and brandId are required." },
        { status: 400 }
      );
    }

    const brand = db.getBrand(body.brandId);
    const brandName = brand ? brand.name : body.brandName || "Unknown Brand";

    const newInv = db.createInvestigation({
      orgId: body.orgId || "org-cipher-01",
      brandId: body.brandId,
      brandName,
      title: body.title,
      summary: body.summary || "",
      findingIds: body.findingIds || [],
      severity: body.severity || "medium",
      priority: body.priority || "p2",
      status: "new",
      assignedTo: body.assignedTo || {
        id: "usr-02",
        name: "Marcus Kane",
        role: "Security Analyst",
      },
      notes: body.initialNote
        ? [
            {
              id: `note-${Date.now()}`,
              author: body.assignedTo?.name || "Marcus Kane",
              authorRole: "Security Analyst",
              text: body.initialNote,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
      timeline: [
        {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: "System",
          type: "status_change",
          description: "Investigation case initialized.",
        },
      ],
      responseActions: [],
    });

    return NextResponse.json({ success: true, data: newInv }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

