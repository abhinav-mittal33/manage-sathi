import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyProjectOwnership, listDrawingVersionsForType } from '@/lib/dal/drawing.dal';
import { drawingTypeEnum } from '@/lib/validations/drawing';

// GET /api/v1/projects/[id]/drawings/history?drawingType=brief
// Returns all versions of a specific drawing type for this project, newest first.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const drawingType = req.nextUrl.searchParams.get('drawingType');
    const parsed = drawingTypeEnum.safeParse(drawingType);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing drawingType' } },
        { status: 422 }
      );
    }

    const projectExists = await verifyProjectOwnership(projectId, user.firmId);
    if (!projectExists) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    const versions = await listDrawingVersionsForType(projectId, user.firmId, parsed.data);
    return NextResponse.json({ success: true, data: versions });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /drawings/history]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
