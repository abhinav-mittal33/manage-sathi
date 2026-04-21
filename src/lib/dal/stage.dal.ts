import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/db';
import { siteStages, projects } from '@/db/schema';

export type SiteStageRow = typeof siteStages.$inferSelect;

// Verify a project exists and belongs to the firm — call before any stage operation
export async function verifyProjectOwnership(
  projectId: string,
  firmId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.firmId, firmId)))
    .limit(1);

  return !!row;
}

// Fetch all stage rows for a project, ordered by sortOrder ascending
export async function getStagesForProject(
  projectId: string,
  firmId: string
): Promise<SiteStageRow[]> {
  return db
    .select()
    .from(siteStages)
    .where(and(eq(siteStages.projectId, projectId), eq(siteStages.firmId, firmId)))
    .orderBy(asc(siteStages.sortOrder));
}

// Fetch a single stage row — verifies firm and project ownership at the row level
export async function getStageById(
  stageId: string,
  projectId: string,
  firmId: string
): Promise<SiteStageRow | null> {
  const [row] = await db
    .select()
    .from(siteStages)
    .where(
      and(
        eq(siteStages.id, stageId),
        eq(siteStages.projectId, projectId),
        eq(siteStages.firmId, firmId)
      )
    )
    .limit(1);

  return row ?? null;
}

// Toggle a leaf stage's completion state.
// completedById is set to userId when completing; cleared when un-completing.
export async function updateStageCompletion(
  stageId: string,
  firmId: string,
  isCompleted: boolean,
  userId: string
): Promise<SiteStageRow | null> {
  const [updated] = await db
    .update(siteStages)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
      completedById: isCompleted ? userId : null,
      updatedAt: new Date(),
    })
    .where(and(eq(siteStages.id, stageId), eq(siteStages.firmId, firmId)))
    .returning();

  return updated ?? null;
}
