import { eq, and, isNull, desc, asc, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import { reminders } from '@/db/schema';
import type { CreateReminderInput, UpdateReminderInput } from '@/lib/validations/reminder';

export type ReminderRow = typeof reminders.$inferSelect;

export async function createReminder(
  firmId: string,
  input: CreateReminderInput
): Promise<ReminderRow> {
  const [row] = await db
    .insert(reminders)
    .values({
      firmId,
      projectId: input.projectId,
      title: input.title,
      reminderType: input.reminderType ?? 'general',
      dueDate: input.dueDate,
      notes: input.notes ?? null,
    })
    .returning();
  return row;
}

export async function listReminders(
  firmId: string,
  opts: { projectId?: string; upcoming?: boolean; limit?: number }
): Promise<ReminderRow[]> {
  const { projectId, upcoming, limit = 20 } = opts;

  const conditions = [eq(reminders.firmId, firmId), isNull(reminders.deletedAt)];

  if (projectId) conditions.push(eq(reminders.projectId, projectId));
  if (upcoming) {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    conditions.push(
      eq(reminders.isCompleted, false),
      gte(reminders.dueDate, today),
      lte(reminders.dueDate, sevenDaysOut)
    );
  }

  return db
    .select()
    .from(reminders)
    .where(and(...conditions))
    .orderBy(asc(reminders.dueDate), desc(reminders.createdAt))
    .limit(limit);
}

export async function listAllUpcomingAndOverdue(
  firmId: string,
  limit = 10
): Promise<ReminderRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.firmId, firmId),
        eq(reminders.isCompleted, false),
        isNull(reminders.deletedAt),
        gte(reminders.dueDate, today)
      )
    )
    .orderBy(asc(reminders.dueDate))
    .limit(limit);
}

export async function getReminderById(
  id: string,
  firmId: string
): Promise<ReminderRow | null> {
  const [row] = await db
    .select()
    .from(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.firmId, firmId), isNull(reminders.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function updateReminder(
  id: string,
  firmId: string,
  patch: UpdateReminderInput
): Promise<ReminderRow | null> {
  const setValues: Record<string, unknown> = { updatedAt: new Date() };

  if (patch.title !== undefined) setValues.title = patch.title;
  if (patch.reminderType !== undefined) setValues.reminderType = patch.reminderType;
  if (patch.dueDate !== undefined) setValues.dueDate = patch.dueDate;
  if (patch.notes !== undefined) setValues.notes = patch.notes;
  if (patch.isCompleted !== undefined) {
    setValues.isCompleted = patch.isCompleted;
    setValues.completedAt = patch.isCompleted ? new Date() : null;
  }

  const [row] = await db
    .update(reminders)
    .set(setValues)
    .where(and(eq(reminders.id, id), eq(reminders.firmId, firmId), isNull(reminders.deletedAt)))
    .returning();

  return row ?? null;
}

export async function deleteReminder(id: string, firmId: string): Promise<boolean> {
  const result = await db
    .update(reminders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reminders.id, id), eq(reminders.firmId, firmId), isNull(reminders.deletedAt)));
  return (result.rowCount ?? 0) > 0;
}

export async function countPendingRemindersForProject(
  projectId: string,
  firmId: string
): Promise<number> {
  const rows = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(
      and(
        eq(reminders.projectId, projectId),
        eq(reminders.firmId, firmId),
        eq(reminders.isCompleted, false),
        isNull(reminders.deletedAt)
      )
    );
  return rows.length;
}
