import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || undefined;
    const jobs = db.getMonitoringJobs(brandId);
    return NextResponse.json({ success: true, count: jobs.length, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId is required." }, { status: 400 });
    }

    const updatedJob = db.runMonitoringJob(jobId);
    if (!updatedJob) {
      return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedJob });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

