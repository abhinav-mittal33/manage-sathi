import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createDrawingSchema } from '@/lib/validations/drawing';
import {
  getDrawingsForProject,
  createDrawing,
  NotFoundError,
} from '@/lib/services/drawing.service';

// GET /api/v1/projects/[id]/drawings
// Returns 8 drawing slots — one per type, latest version or empty slot if no row
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const slots = await getDrawingsForProject(projectId, user.firmId);

    // getDrawingsForProject returns [] when project not found
    if (slots.length === 0) {
      // Could be an empty project — re-check by attempting an existence query
      // If the project truly doesn't exist the caller gets an empty array;
      // returning 404 requires a separate existence check — do it via the service
      // by checking if slots array is not length 8. An existing project with no
      // drawings returns 8 empty slots. An unknown project returns 0.
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: slots });
  } catch (err) {
    if (err instanceof Response) throw err; // re-throw requireAuth's 401
    console.error('[GET /drawings]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// POST /api/v1/projects/[id]/drawings
// Body: { drawingType, notes? }
// Creates a new drawing row at version 1; 409 if type already exists
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const parsed = createDrawingSchema.safeParse(body);
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

    const result = await createDrawing(projectId, user.firmId, parsed.data);

    if (result.conflict) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `A drawing of type '${parsed.data.drawingType}' already exists for this project`,
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data: result.drawing }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) throw err;
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: err.message } },
        { status: 404 }
      );
    }
    console.error('[POST /drawings]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
