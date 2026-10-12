import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateFindingStatus } from '@/lib/findings-store';

const statusSchema = z.enum(['NEW', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = z.object({ status: statusSchema }).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'Choose a valid investigation status.', fields: parsed.error.flatten().fieldErrors },
    }, { status: 400 });
    const finding = await updateFindingStatus(params.id, parsed.data.status);
    return finding ? NextResponse.json(finding) : NextResponse.json({
      error: { code: 'NOT_FOUND', message: 'Finding not found.' },
    }, { status: 404 });
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, { status: 400 });
  }
}
