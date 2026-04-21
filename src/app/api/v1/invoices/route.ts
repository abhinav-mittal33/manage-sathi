import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createInvoiceSchema } from '@/lib/validations/invoice';
import { getInvoices, createInvoice } from '@/lib/services/invoice.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const { searchParams } = request.nextUrl;
    const data = await getInvoices(user.firmId, {
      projectId: searchParams.get('projectId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[GET /api/v1/invoices]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invoices' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireAuth();
    const body: unknown = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: parsed.error.flatten() } }, { status: 422 });
    }
    const invoice = await createInvoice(user.firmId, parsed.data);
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /api/v1/invoices]', err);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create invoice' } }, { status: 500 });
  }
}
