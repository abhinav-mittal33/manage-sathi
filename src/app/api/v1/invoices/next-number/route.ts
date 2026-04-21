import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { nextInvoiceNumber } from '@/lib/services/invoice.service';

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const number = await nextInvoiceNumber(user.firmId);
    return NextResponse.json({ success: true, data: { nextNumber: number } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/invoices/next-number]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get next number' } }, { status: 500 });
  }
}
