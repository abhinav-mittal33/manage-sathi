import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listStages, NotFoundError } from '@/lib/services/stage.service';

// GET /api/v1/projects/[id]/stages
// Returns all site_stage rows for the project ordered by sortOrder.
// Project ownership is verified server-side using firmId from JWT.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const stages = await listStages(projectId, user.firmId);

    return NextResponse.json({ success: true, data: stages });
  } catch (err) {
    if (err instanceof Response) throw err; // re-throw requireAuth's 401
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 }
      );
    }
    console.error('[GET /stages]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
