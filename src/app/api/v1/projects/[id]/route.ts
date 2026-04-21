import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateProjectSchema } from '@/lib/validations/project';
import { getProject, editProject, deleteProject } from '@/lib/services/project.service';

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const project = await getProject(params.id, user.firmId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/projects/:id]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch project' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    const body: unknown = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const updated = await editProject(params.id, user.firmId, parsed.data);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[PUT /api/v1/projects/:id]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update project' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const deleted = await deleteProject(params.id, user.firmId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[DELETE /api/v1/projects/:id]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete project' } },
      { status: 500 }
    );
  }
}
