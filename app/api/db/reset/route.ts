import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    db.resetDatabase();
    return NextResponse.json({
      success: true,
      message: "Database successfully reset to initial seed state with multi-industry brands and findings.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

