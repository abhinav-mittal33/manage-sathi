import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listDeletedNotes } from '@/lib/dal/site-note.dal';
import type { ApiResponse } from '@/types';

// GET /api/v1/site-notes/deleted — notes soft-deleted within the last 30 days
export async function GET(): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const notes = await listDeletedNotes(auth.firmId);
    return NextResponse.json({ success: true, data: notes } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/site-notes/deleted]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch deleted notes' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
