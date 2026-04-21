import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateInvoiceSchema } from '@/lib/validations/invoice';
import { getInvoice, editInvoice, deleteInvoice } from '@/lib/services/invoice.service';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const invoice = await getInvoice(params.id, user.firmId);
    if (!invoice) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, { status: 404 });
    return NextResponse.json({ success: true, data: invoice });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/invoices/[id]]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invoice' } }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid data', details: parsed.error.flatten() } }, { status: 422 });
    const updated = await editInvoice(params.id, user.firmId, parsed.data);
    if (!updated) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found or not a draft' } }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[PUT /api/v1/invoices/[id]]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update invoice' } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const deleted = await deleteInvoice(params.id, user.firmId);
    if (!deleted) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found or not a draft' } }, { status: 404 });
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[DELETE /api/v1/invoices/[id]]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete invoice' } }, { status: 500 });
  }
}
