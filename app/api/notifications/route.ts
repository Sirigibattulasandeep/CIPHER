import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId") || undefined;
    const notifications = db.getNotifications(orgId);
    const unreadCount = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ success: true, count: notifications.length, unreadCount, data: notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAll, orgId } = body;

    if (markAll) {
      db.markAllNotificationsRead(orgId);
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (id) {
      const ok = db.markNotificationRead(id);
      return NextResponse.json({ success: ok, message: ok ? "Marked as read." : "Not found." });
    }

    return NextResponse.json({ success: false, error: "Missing id or markAll flag." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

