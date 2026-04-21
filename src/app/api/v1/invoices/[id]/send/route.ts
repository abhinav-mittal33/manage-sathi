import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendInvoiceToClient } from '@/lib/services/invoice.service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const updated = await sendInvoiceToClient(params.id, user.firmId);
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /api/v1/invoices/[id]/send]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to send invoice' } }, { status: 500 });
  }
}
