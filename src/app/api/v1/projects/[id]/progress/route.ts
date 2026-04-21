import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db } from '@/db';
import { projects, clients, siteStages, drawings } from '@/db/schema';
import { computeProgress } from '@/lib/services/progress.service';

// GET /api/v1/projects/[id]/progress
// PUBLIC — no auth required. Powers the client-facing share link.
// Intentionally no requireAuth() call — see project CLAUDE.md public routes list.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id: projectId } = params;

  try {
    // Fetch project joined with client — a single query avoids N+1 and gives us clientName
    const [projectRow] = await db
      .select({
        id: projects.id,
        name: projects.name,
        currentPhase: projects.currentPhase,
        status: projects.status,
        clientId: projects.clientId,
        clientName: clients.name,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.id, projectId),
          // Exclude soft-deleted projects — deleted projects should not be publicly visible
          isNull(projects.deletedAt)
        )
      )
      .limit(1);

    if (!projectRow) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    // Fetch all site stages and active drawings for this project in parallel
    const [stageRows, drawingRows] = await Promise.all([
      db
        .select()
        .from(siteStages)
        .where(eq(siteStages.projectId, projectId))
        .orderBy(asc(siteStages.sortOrder)),
      db
        .select({ id: drawings.id, status: drawings.status })
        .from(drawings)
        .where(
          and(
            eq(drawings.projectId, projectId),
            isNull(drawings.deletedAt)
          )
        ),
    ]);

    const progress = computeProgress(stageRows);

    // Count latest drawing versions only — each drawingType has one active entry per version;
    // we count total distinct (not_started entries still exist as placeholders when seeded)
    const totalDrawings = drawingRows.length;
    const approvedDrawings = drawingRows.filter((d) => d.status === 'approved').length;

    return NextResponse.json({
      success: true,
      data: {
        project: {
          id: projectRow.id,
          name: projectRow.name,
          clientName: projectRow.clientName,
          currentPhase: projectRow.currentPhase,
          status: projectRow.status,
        },
        progress,
        drawings: {
          total: totalDrawings,
          approved: approvedDrawings,
        },
      },
    });
  } catch (err) {
    console.error('[GET /projects/[id]/progress]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
