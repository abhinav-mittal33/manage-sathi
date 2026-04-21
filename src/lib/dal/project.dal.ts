import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '@/db';
import { projects, clients, siteStages } from '@/db/schema';
import type { CreateProjectInput, UpdateProjectInput } from '@/lib/validations/project';
import { STAGE_FLAT } from '@/lib/constants/stage-hierarchy';

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectWithClient = ProjectRow & {
  client: Pick<typeof clients.$inferSelect, 'id' | 'name' | 'phone'> | null;
};

// List all non-deleted projects for a firm, with optional filters
export async function listProjects(
  firmId: string,
  filters: { clientId?: string; status?: string } = {}
): Promise<ProjectWithClient[]> {
  const conditions = [eq(projects.firmId, firmId), isNull(projects.deletedAt)];

  if (filters.clientId) {
    conditions.push(eq(projects.clientId, filters.clientId));
  }
  if (filters.status) {
    conditions.push(eq(projects.status, filters.status));
  }

  const rows = await db
    .select({
      id: projects.id,
      firmId: projects.firmId,
      clientId: projects.clientId,
      name: projects.name,
      addressLine1: projects.addressLine1,
      addressLine2: projects.addressLine2,
      city: projects.city,
      state: projects.state,
      pincode: projects.pincode,
      currentPhase: projects.currentPhase,
      status: projects.status,
      latitude: projects.latitude,
      longitude: projects.longitude,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      deletedAt: projects.deletedAt,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(projects.createdAt))
    .limit(100);

  return rows.map((r) => {
    const { clientName, clientPhone, ...projectFields } = r;
    return {
      ...projectFields,
      client: clientName ? { id: r.clientId, name: clientName, phone: clientPhone ?? '' } : null,
    };
  });
}

// Get a single project by id + firmId (guards cross-firm access)
export async function getProjectById(
  id: string,
  firmId: string
): Promise<ProjectWithClient | null> {
  const rows = await db
    .select({
      id: projects.id,
      firmId: projects.firmId,
      clientId: projects.clientId,
      name: projects.name,
      addressLine1: projects.addressLine1,
      addressLine2: projects.addressLine2,
      city: projects.city,
      state: projects.state,
      pincode: projects.pincode,
      currentPhase: projects.currentPhase,
      status: projects.status,
      latitude: projects.latitude,
      longitude: projects.longitude,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      deletedAt: projects.deletedAt,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .where(and(eq(projects.id, id), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .limit(1);

  if (!rows[0]) return null;

  const r = rows[0];
  const { clientName, clientPhone, ...projectFields } = r;
  return {
    ...projectFields,
    client: clientName ? { id: r.clientId, name: clientName, phone: clientPhone ?? '' } : null,
  };
}

// Insert a new project row and seed all site_stages in one transaction
export async function createProject(
  firmId: string,
  input: CreateProjectInput
): Promise<ProjectRow> {
  // Insert the project first
  const [project] = await db
    .insert(projects)
    .values({
      firmId,
      clientId: input.clientId,
      name: input.name,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      status: input.status ?? 'active',
      currentPhase: input.currentPhase ?? 'drawing',
    })
    .returning();

  // Seed all stage nodes for this project in a single batch insert
  const stageSeedRows = STAGE_FLAT.map((stage) => ({
    firmId,
    projectId: project.id,
    stageKey: stage.key,
    displayName: stage.displayName,
    parentKey: stage.parentKey,
    sortOrder: stage.sortOrder,
    weight: String(stage.weight),
    isCompleted: false,
  }));

  if (stageSeedRows.length > 0) {
    await db.insert(siteStages).values(stageSeedRows);
  }

  return project;
}

// Update mutable project fields
export async function updateProject(
  id: string,
  firmId: string,
  input: UpdateProjectInput
): Promise<ProjectRow | null> {
  const updateValues: Partial<typeof projects.$inferInsert> = {};

  if (input.name !== undefined) updateValues.name = input.name;
  if (input.clientId !== undefined) updateValues.clientId = input.clientId;
  if (input.addressLine1 !== undefined) updateValues.addressLine1 = input.addressLine1 || null;
  if (input.addressLine2 !== undefined) updateValues.addressLine2 = input.addressLine2 || null;
  if (input.city !== undefined) updateValues.city = input.city || null;
  if (input.state !== undefined) updateValues.state = input.state || null;
  if (input.pincode !== undefined) updateValues.pincode = input.pincode || null;
  if (input.status !== undefined) updateValues.status = input.status;
  if (input.currentPhase !== undefined) updateValues.currentPhase = input.currentPhase;

  updateValues.updatedAt = new Date();

  const [updated] = await db
    .update(projects)
    .set(updateValues)
    .where(and(eq(projects.id, id), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .returning();

  return updated ?? null;
}

// Soft-delete: sets deleted_at, never hard-deletes
export async function softDeleteProject(id: string, firmId: string): Promise<boolean> {
  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.firmId, firmId), isNull(projects.deletedAt)))
    .returning({ id: projects.id });

  return !!deleted;
}
