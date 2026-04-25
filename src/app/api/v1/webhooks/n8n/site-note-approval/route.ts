import { NextRequest, NextResponse } from 'next/server';
import { findPendingApprovalByClientPhone, updateNoteApprovalStatus } from '@/lib/dal/site-note.dal';

// POST /api/v1/webhooks/n8n/site-note-approval
// Called by n8n when a client replies YES/NO to an approval request on WhatsApp.
// No user auth — validated by X-Webhook-Secret header.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get('X-Webhook-Secret');
  if (process.env.N8N_WEBHOOK_SECRET && secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { phone?: string; reply?: string };
    const { phone, reply } = body;

    if (!phone || !reply) {
      return NextResponse.json({ success: false, error: 'phone and reply required' }, { status: 400 });
    }

    const normalised = reply.trim().toUpperCase();
    if (normalised !== 'YES' && normalised !== 'NO') {
      return NextResponse.json({ success: true, data: { skipped: true, reason: 'reply not YES or NO' } });
    }

    const note = await findPendingApprovalByClientPhone(phone);
    if (!note) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: 'no pending approval found for this phone' } });
    }

    const status = normalised === 'YES' ? 'approved' : 'rejected';
    await updateNoteApprovalStatus(note.id, note.firmId, status);

    console.log(`[Webhook] Approval ${status} for note ${note.id} from phone ${phone}`);
    return NextResponse.json({ success: true, data: { noteId: note.id, status } });
  } catch (err) {
    console.error('[POST /webhooks/n8n/site-note-approval]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
