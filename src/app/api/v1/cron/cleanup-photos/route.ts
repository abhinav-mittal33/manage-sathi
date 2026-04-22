import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { findPhotosReadyForDeletion, clearPhotoUrl } from '@/lib/dal/site-note.dal';
import { deleteFromR2, keyFromPublicUrl } from '@/lib/storage';

// POST /api/v1/cron/cleanup-photos
// Deletes R2 objects for site notes soft-deleted >30 days ago.
// Call this on a schedule (e.g. Vercel Cron daily) or manually.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const rows = await findPhotosReadyForDeletion(auth.firmId);

    let deleted = 0;
    let failed = 0;

    for (const row of rows) {
      const key = keyFromPublicUrl(row.photoUrl);
      if (!key) {
        await clearPhotoUrl(row.id);
        continue;
      }
      try {
        await deleteFromR2(key);
        await clearPhotoUrl(row.id);
        deleted++;
      } catch (err) {
        console.error(`[cleanup-photos] Failed to delete R2 key ${key}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ success: true, data: { deleted, failed, total: rows.length } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /api/v1/cron/cleanup-photos]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Cleanup failed' } },
      { status: 500 }
    );
  }
}
