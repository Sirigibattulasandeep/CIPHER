import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateInvestigationStatus } from '@/lib/investigations-store';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const parsed = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']) }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Choose a valid investigation status.' } }, { status: 400 });
    const updated = await updateInvestigationStatus(id, parsed.data.status);
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Investigation not found.' } }, { status: 404 });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
