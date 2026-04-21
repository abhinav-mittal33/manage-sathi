import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { syncBatchSchema } from '@/lib/validations/site-note';
import { syncNotes } from '@/lib/services/site-note.service';
import type { ApiResponse } from '@/types';

// POST /api/v1/site-notes/sync — idempotent offline batch sync
// Body: array of up to 50 notes. Notes already on server (same firmId+localId) are skipped.
// Returns { synced, skipped, failed, results } regardless of per-note outcome so client
// can mark all items done after a single 200.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();

    const body: unknown = await request.json();
    const parsed = syncBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid sync batch',
            details: parsed.error.flatten().fieldErrors,
          },
        } satisfies ApiResponse,
        { status: 422 }
      );
    }

    const result = await syncNotes(auth.firmId, auth.userId, parsed.data);
    return NextResponse.json({ success: true, data: result } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[POST /api/v1/site-notes/sync]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Sync failed' },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
