import {
  verifyProjectOwnership,
  getStagesForProject,
  getStageById,
  updateStageCompletion,
  type SiteStageRow,
} from '@/lib/dal/stage.dal';
import { computeProgress, type ProgressResult } from '@/lib/services/progress.service';

export type { SiteStageRow };

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ParentNodeError extends Error {
  constructor() {
    super('Only leaf stages can be toggled');
    this.name = 'ParentNodeError';
  }
}

// List all stage rows for a project
export async function listStages(
  projectId: string,
  firmId: string
): Promise<SiteStageRow[]> {
  const exists = await verifyProjectOwnership(projectId, firmId);
  if (!exists) throw new NotFoundError('Project not found');

  return getStagesForProject(projectId, firmId);
}

// Toggle a single leaf stage's completion state.
// Throws ParentNodeError if the stage has weight == 0 (it's a parent/group node).
export async function toggleStage(
  stageId: string,
  projectId: string,
  firmId: string,
  isCompleted: boolean,
  userId: string
): Promise<SiteStageRow> {
  const exists = await verifyProjectOwnership(projectId, firmId);
  if (!exists) throw new NotFoundError('Project not found');

  const stage = await getStageById(stageId, projectId, firmId);
  if (!stage) throw new NotFoundError('Stage not found');

  // Weight is stored as a decimal string by Drizzle — '0' means parent/group node
  const weightNum = parseFloat(stage.weight ?? '0');
  if (weightNum === 0) throw new ParentNodeError();

  const updated = await updateStageCompletion(stageId, firmId, isCompleted, userId);
  if (!updated) throw new NotFoundError('Stage not found after update');

  return updated;
}

// Compute progress for a project — fetches all rows then delegates to pure computeProgress
export async function getProjectProgress(
  projectId: string,
  firmId: string
): Promise<ProgressResult> {
  const exists = await verifyProjectOwnership(projectId, firmId);
  if (!exists) throw new NotFoundError('Project not found');

  const stages = await getStagesForProject(projectId, firmId);
  return computeProgress(stages);
}
