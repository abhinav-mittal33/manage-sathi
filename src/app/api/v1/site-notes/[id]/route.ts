import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getNote } from '@/lib/services/site-note.service';
import { softDeleteSiteNote, restoreSiteNote } from '@/lib/dal/site-note.dal';
import type { ApiResponse } from '@/types';

// GET /api/v1/site-notes/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const note = await getNote(id, auth.firmId);
    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Site note not found' },
        } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: note } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[GET /api/v1/site-notes/[id]]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch site note' },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/v1/site-notes/[id]/restore is handled in a sub-route.
// PATCH /api/v1/site-notes/[id] — restore a deleted note
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const restored = await restoreSiteNote(id, auth.firmId);
    if (!restored) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Deleted note not found' } } satisfies ApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: null } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[PATCH /api/v1/site-notes/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to restore note' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE /api/v1/site-notes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const deleted = await softDeleteSiteNote(id, auth.firmId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Site note not found' } } satisfies ApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: null } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[DELETE /api/v1/site-notes/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete site note' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
