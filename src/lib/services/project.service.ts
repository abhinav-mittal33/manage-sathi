import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  softDeleteProject,
  type ProjectWithClient,
} from '@/lib/dal/project.dal';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validations/project';

export type { ProjectWithClient };

export async function getProjects(
  firmId: string,
  filters: { clientId?: string; status?: string } = {}
): Promise<ProjectWithClient[]> {
  return listProjects(firmId, filters);
}

export async function getProject(id: string, firmId: string): Promise<ProjectWithClient | null> {
  return getProjectById(id, firmId);
}

export async function createNewProject(
  firmId: string,
  input: CreateProjectInput
): Promise<ProjectWithClient> {
  const project = await createProject(firmId, input);

  // Return project with null client initially — caller can re-fetch if full client data needed
  return {
    ...project,
    client: null,
  };
}

export async function editProject(
  id: string,
  firmId: string,
  input: UpdateProjectInput
): Promise<ProjectWithClient | null> {
  const updated = await updateProject(id, firmId, input);
  if (!updated) return null;

  // Re-fetch to include joined client data
  return getProjectById(id, firmId);
}

export async function deleteProject(id: string, firmId: string): Promise<boolean> {
  return softDeleteProject(id, firmId);
}
