import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createInvestigation, listInvestigations } from '@/lib/investigations-store';

export async function GET(request: Request) {
  const findingId = new URL(request.url).searchParams.get('findingId') || undefined;
  return NextResponse.json(await listInvestigations(findingId));
}

export async function POST(request: Request) {
  try {
    const parsed = z.object({ findingId: z.string().min(1).max(200) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Provide a valid finding ID.' } }, { status: 400 });
    const investigation = await createInvestigation(parsed.data.findingId);
    return investigation ? NextResponse.json(investigation, { status: 201 }) : NextResponse.json({ error: { code: 'FINDING_NOT_FOUND', message: 'Finding not found in this organisation.' } }, { status: 404 });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
