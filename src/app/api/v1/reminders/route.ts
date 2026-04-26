import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createReminder, listReminders } from '@/lib/dal/reminder.dal';
import { createReminderSchema } from '@/lib/validations/reminder';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId') ?? undefined;
    const upcoming = searchParams.get('upcoming') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const rows = await listReminders(user.firmId, { projectId, upcoming, limit });
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/v1/reminders]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to load reminders' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const parsed = createReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid input', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const reminder = await createReminder(user.firmId, parsed.data);
    return NextResponse.json({ success: true, data: reminder }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[POST /api/v1/reminders]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to create reminder' } },
      { status: 500 }
    );
  }
}
