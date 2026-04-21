import { NextRequest, NextResponse } from 'next/server';
import { webhookApprovalSchema } from '@/lib/validations/drawing';
import { processApprovalWebhook } from '@/lib/services/drawing.service';

// POST /api/v1/webhooks/n8n/drawing-approval
// No JWT auth — authenticated via X-Webhook-Secret header.
// Called by n8n when a client replies to a WhatsApp drawing approval message.
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify shared secret before touching any data
  const incomingSecret = req.headers.get('X-Webhook-Secret');
  if (!incomingSecret || incomingSecret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } },
      { status: 400 }
    );
  }

  const parsed = webhookApprovalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((i) => i.message).join(', '),
        },
      },
      { status: 422 }
    );
  }

  try {
    const result = await processApprovalWebhook(parsed.data);

    if (result.notFound) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    if (result.invalidTransition) {
      // Log server-side but return 200 to n8n so it doesn't retry — this is a logic issue, not a transient failure
      console.warn('[Webhook drawing-approval] Invalid transition:', result.invalidTransition, 'drawingId:', parsed.data.drawingId);
      return NextResponse.json({ success: true, data: { skipped: true, reason: result.invalidTransition } });
    }

    return NextResponse.json({ success: true, data: { drawing: result.drawing } });
  } catch (err) {
    console.error('[Webhook drawing-approval]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
