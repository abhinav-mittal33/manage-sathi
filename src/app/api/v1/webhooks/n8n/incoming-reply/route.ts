import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findPendingApprovalByClientPhone, updateNoteApprovalStatus } from '@/lib/dal/site-note.dal';
import { processDrawingReplyByPhone } from '@/lib/services/drawing.service';

const bodySchema = z.object({
  phone: z.string().min(1),
  reply: z.enum(['YES', 'NO']),
  opinionText: z.string().max(1000).nullable().optional(),
});

// POST /api/v1/webhooks/n8n/incoming-reply
// Unified handler for all incoming WhatsApp YES/NO replies.
// Handles both site-note approval_request and drawing approvals in one call.
// n8n Parse Reply node sends here after extracting reply + opinionText.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 422 }
    );
  }

  const { phone, reply, opinionText } = parsed.data;
  const status = reply === 'YES' ? 'approved' : 'rejected';

  try {
    const results: Record<string, unknown> = {};

    // ── 1. Site note approval_request ────────────────────────────────────────
    const note = await findPendingApprovalByClientPhone(phone);
    if (note) {
      await updateNoteApprovalStatus(note.id, note.firmId, status, opinionText ?? null);
      results.note = { id: note.id, status };
      console.log(`[incoming-reply] Note ${note.id} → ${status} from ${phone}${opinionText ? ` (opinion: "${opinionText}")` : ''}`);
    }

    // ── 2. Drawing submitted approval ─────────────────────────────────────────
    const drawingResult = await processDrawingReplyByPhone(phone, reply, opinionText ?? null);
    if (!drawingResult.skipped && drawingResult.drawing) {
      results.drawing = { id: drawingResult.drawing.id, status: drawingResult.drawing.status };
      console.log(`[incoming-reply] Drawing ${drawingResult.drawing.id} → ${drawingResult.drawing.status} from ${phone}`);
    }

    if (!results.note && !results.drawing) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: 'no pending approval or submitted drawing found' } });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error('[POST /webhooks/n8n/incoming-reply]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
