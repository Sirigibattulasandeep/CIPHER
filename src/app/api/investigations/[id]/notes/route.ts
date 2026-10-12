import { NextResponse } from 'next/server';
import { z } from 'zod';
import { addInvestigationNote } from '@/lib/investigations-store';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const parsed = z.object({ body: z.string().trim().min(1).max(5000) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'A note is required (maximum 5,000 characters).' } }, { status: 400 });
    const investigation = await addInvestigationNote(id, parsed.data.body);
    return investigation ? NextResponse.json(investigation) : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Investigation not found.' } }, { status: 404 });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
