import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listProjects } from '@/lib/dal/project.dal';
import { db } from '@/db';
import { drawings, invoices, siteNotes } from '@/db/schema';
import { eq, and, isNull, inArray, gte } from 'drizzle-orm';
import { listAllUpcomingAndOverdue } from '@/lib/dal/reminder.dal';

export async function GET() {
  try {
    const user = await requireAuth();
    const { firmId } = user;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [allProjects, pendingDrawingRows, pendingInvoiceRows, siteNotesTodayRows, upcomingReminders] =
      await Promise.all([
        listProjects(firmId),
        db
          .select({ id: drawings.id })
          .from(drawings)
          .where(and(eq(drawings.firmId, firmId), eq(drawings.status, 'submitted'), isNull(drawings.deletedAt))),
        db
          .select({ id: invoices.id })
          .from(invoices)
          .where(
            and(
              eq(invoices.firmId, firmId),
              inArray(invoices.status, ['sent', 'overdue']),
              isNull(invoices.deletedAt)
            )
          ),
        db
          .select({ id: siteNotes.id })
          .from(siteNotes)
          .where(
            and(
              eq(siteNotes.firmId, firmId),
              isNull(siteNotes.deletedAt),
              gte(siteNotes.createdAt, today)
            )
          ),
        listAllUpcomingAndOverdue(firmId, 5),
      ]);

    const activeProjects = allProjects.filter((p) => p.status === 'active');
    const recentProjects = allProjects.slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        activeProjects: activeProjects.length,
        pendingDrawings: pendingDrawingRows.length,
        pendingInvoices: pendingInvoiceRows.length,
        siteNotesToday: siteNotesTodayRows.length,
        upcomingReminders,
        recentProjects,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[GET /api/v1/dashboard]', err);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to load dashboard' } },
      { status: 500 }
    );
  }
}
