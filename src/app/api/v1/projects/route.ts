import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createProjectSchema } from '@/lib/validations/project';
import { getProjects, createNewProject } from '@/lib/services/project.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    const { searchParams } = request.nextUrl;
    const clientId = searchParams.get('clientId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    const projects = await getProjects(user.firmId, { clientId, status });

    return NextResponse.json({ success: true, data: projects });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/projects]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch projects' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();

    const body: unknown = await request.json();
    const parsed = createProjectSchema.safeParse(body);

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

    // firmId always from JWT — never from request body
    const project = await createNewProject(user.firmId, parsed.data);

    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /api/v1/projects]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create project' } },
      { status: 500 }
    );
  }
}
