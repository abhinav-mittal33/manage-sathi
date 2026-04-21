import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { recordPaymentSchema } from '@/lib/validations/invoice';
import { recordInvoicePayment } from '@/lib/services/invoice.service';

export async function POST(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payment data', details: parsed.error.flatten() } }, { status: 422 });
    const updated = await recordInvoicePayment(params.id, user.firmId, parsed.data);
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /api/v1/invoices/[id]/payment]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to record payment' } }, { status: 500 });
  }
}
