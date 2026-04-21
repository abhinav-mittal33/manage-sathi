import { NextRequest, NextResponse } from 'next/server';

// POST /api/v1/webhooks/n8n
// Generic fallback handler for n8n callbacks that don't match a specific route.
// No JWT auth — authenticated by X-Webhook-Secret header only.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = request.headers.get('X-Webhook-Secret');
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Log for debugging — payload is arbitrary from n8n workflows
  console.log('[n8n webhook]', JSON.stringify(body));

  return NextResponse.json({ success: true, received: true });
}
