import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getReminderById, updateReminder, deleteReminder } from '@/lib/dal/reminder.dal';
import { updateReminderSchema } from '@/lib/validations/reminder';

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const reminder = await getReminderById(params.id, user.firmId);
    if (!reminder) {
      return NextResponse.json(
        { success: false, error: { message: 'Reminder not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: reminder });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/v1/reminders/[id]]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to load reminder' } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = updateReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const updated = await updateReminder(params.id, user.firmId, parsed.data);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: { message: 'Reminder not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[PATCH /api/v1/reminders/[id]]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update reminder' } },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const deleted = await deleteReminder(params.id, user.firmId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { message: 'Reminder not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[DELETE /api/v1/reminders/[id]]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete reminder' } },
      { status: 500 }
    );
  }
}
