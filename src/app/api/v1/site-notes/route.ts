import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { siteNoteSchema } from '@/lib/validations/site-note';
import { createNote, listNotes } from '@/lib/services/site-note.service';
import type { ApiResponse } from '@/types';

// GET /api/v1/site-notes?projectId=&limit=20&cursor=
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const params = request.nextUrl.searchParams;

    const projectId = params.get('projectId');
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'projectId query parameter is required' },
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const rawLimit = parseInt(params.get('limit') ?? '20', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 50);
    const cursor = params.get('cursor') ?? undefined;

    const { notes, nextCursor } = await listNotes(auth.firmId, { projectId, limit, cursor });

    return NextResponse.json({
      success: true,
      data: { notes, nextCursor, limit },
    } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[GET /api/v1/site-notes]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch site notes' },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/v1/site-notes — online single-note creation
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();

    const body: unknown = await request.json();
    const parsed = siteNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parsed.error.flatten().fieldErrors,
          },
        } satisfies ApiResponse,
        { status: 422 }
      );
    }

    const note = await createNote(auth.firmId, auth.userId, parsed.data);
    return NextResponse.json(
      { success: true, data: note } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[POST /api/v1/site-notes]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create site note' },
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
