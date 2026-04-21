import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateDrawingSchema } from '@/lib/validations/drawing';
import { getDrawing, updateDrawing } from '@/lib/services/drawing.service';

type RouteParams = { params: Promise<{ id: string; drawingId: string }> };

// GET /api/v1/projects/[id]/drawings/[drawingId]
// Returns a single drawing row, verified against firmId
export async function GET(
  _req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId, drawingId } = await params;

    const drawing = await getDrawing(drawingId, projectId, user.firmId);
    if (!drawing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: drawing });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /drawings/:drawingId]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// PUT /api/v1/projects/[id]/drawings/[drawingId]
// Body: { action: 'submit' | 'revise', notes?, fileUrl? }
// submit: not_started → submitted, triggers WhatsApp
// revise: approved → inserts new version row (does NOT mutate existing row)
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId, drawingId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const parsed = updateDrawingSchema.safeParse(body);
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

    const result = await updateDrawing(drawingId, projectId, user.firmId, parsed.data);
    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    if (result.invalidTransition) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_TRANSITION', message: result.invalidTransition },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: result.drawing });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[PUT /drawings/:drawingId]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
