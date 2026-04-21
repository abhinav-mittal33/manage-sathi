import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { uploadRequestSchema } from '@/lib/validations/drawing';
import { getDrawingUploadUrl } from '@/lib/services/drawing.service';

type RouteParams = { params: Promise<{ id: string; drawingId: string }> };

// POST /api/v1/projects/[id]/drawings/[drawingId]/upload
// Generates a presigned R2 PUT URL for direct client-side upload.
// Client uploads file to R2, then PUTs fileUrl back via /drawings/[drawingId].
export async function POST(
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

    const parsed = uploadRequestSchema.safeParse(body);
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

    const result = await getDrawingUploadUrl(drawingId, projectId, user.firmId, parsed.data);
    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /drawings/:drawingId/upload]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
