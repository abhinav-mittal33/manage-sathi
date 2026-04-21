import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { toggleStageSchema, stageIdSchema } from '@/lib/validations/stage';
import {
  toggleStage,
  NotFoundError,
  ParentNodeError,
} from '@/lib/services/stage.service';

// PUT /api/v1/projects/[id]/stages/[stageId]
// Body: { isCompleted: boolean }
// Toggles a leaf stage's completion. Client sends the desired final state explicitly.
// Returns 400 PARENT_NODE if the stage is a group/category node (weight == 0).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId, stageId } = await params;

    // Validate stageId is a UUID before hitting the DB
    const stageIdParsed = stageIdSchema.safeParse(stageId);
    if (!stageIdParsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid stage ID' } },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const parsed = toggleStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues.map((i) => i.message).join(', '),
          },
        },
        { status: 422 }
      );
    }

    const updated = await toggleStage(
      stageId,
      projectId,
      user.firmId,
      parsed.data.isCompleted,
      user.userId
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 }
      );
    }
    if (err instanceof ParentNodeError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PARENT_NODE', message: err.message },
        },
        { status: 400 }
      );
    }
    console.error('[PUT /stages/:stageId]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
