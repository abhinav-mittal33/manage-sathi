import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getProjectProgress, NotFoundError } from '@/lib/services/stage.service';

// GET /api/v1/projects/[id]/stages/progress
// Returns overall completion percent plus a per-category breakdown.
// All weights are derived dynamically from DB rows — denominator is never hardcoded.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const progress = await getProjectProgress(projectId, user.firmId);

    return NextResponse.json({ success: true, data: progress });
  } catch (err) {
    if (err instanceof Response) throw err;
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 }
      );
    }
    console.error('[GET /stages/progress]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
