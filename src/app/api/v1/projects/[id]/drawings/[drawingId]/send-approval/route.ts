import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { resendDrawingApproval } from '@/lib/services/drawing.service';

type RouteParams = { params: Promise<{ id: string; drawingId: string }> };

// POST /api/v1/projects/[id]/drawings/[drawingId]/send-approval
// Re-triggers the WhatsApp approval message for a submitted drawing.
// Only works when drawing.status === 'submitted'.
export async function POST(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId, drawingId } = await params;

    const result = await resendDrawingApproval(drawingId, projectId, user.firmId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    if (!result.sent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_STATE', message: result.reason ?? 'Could not send approval' },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /drawings/:drawingId/send-approval]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
