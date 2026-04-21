import { and, eq, isNull, ilike, or, desc } from 'drizzle-orm';
import { db } from '@/db';
import { clients } from '@/db/schema';
import type { CreateClientInput, UpdateClientInput } from '@/lib/validations/client';

export type ClientRow = typeof clients.$inferSelect;

export async function findClientsByFirm(
  firmId: string,
  search?: string,
  limit = 50,
  offset = 0
): Promise<ClientRow[]> {
  const baseCondition = and(eq(clients.firmId, firmId), isNull(clients.deletedAt));

  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    return db
      .select()
      .from(clients)
      .where(
        and(
          baseCondition,
          or(ilike(clients.name, pattern), ilike(clients.phone, pattern))
        )
      )
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(clients)
    .where(baseCondition)
    .orderBy(desc(clients.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function findClientById(
  id: string,
  firmId: string
): Promise<ClientRow | undefined> {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
    .limit(1);
  return row;
}

export async function insertClient(
  firmId: string,
  input: CreateClientInput
): Promise<ClientRow> {
  const [row] = await db
    .insert(clients)
    .values({
      firmId,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      // Stored in addressLine1 — schema has no single 'address' col
      addressLine1: input.address || null,
    })
    .returning();
  return row;
}

export async function updateClientById(
  id: string,
  firmId: string,
  input: UpdateClientInput
): Promise<ClientRow | undefined> {
  const updateValues: Partial<typeof clients.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) updateValues.name = input.name;
  if (input.phone !== undefined) updateValues.phone = input.phone;
  if (input.email !== undefined) updateValues.email = input.email || null;
  if (input.address !== undefined) updateValues.addressLine1 = input.address || null;

  const [row] = await db
    .update(clients)
    .set(updateValues)
    .where(and(eq(clients.id, id), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
    .returning();

  return row;
}

export async function softDeleteClient(
  id: string,
  firmId: string
): Promise<ClientRow | undefined> {
  const [row] = await db
    .update(clients)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.firmId, firmId), isNull(clients.deletedAt)))
    .returning();
  return row;
}
