import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClientSchema } from '@/lib/validations/client';
import { listClients, createClient } from '@/lib/services/client.service';
import type { ApiResponse } from '@/types';

// GET /api/v1/clients?search=
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const clients = await listClients(auth.firmId, search);
    return NextResponse.json({ success: true, data: clients } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[GET /api/v1/clients]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch clients' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/v1/clients
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth();

    const body: unknown = await request.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parsed.error.flatten().fieldErrors,
          },
        } satisfies ApiResponse,
        { status: 422 }
      );
    }

    const client = await createClient(auth.firmId, parsed.data);
    return NextResponse.json({ success: true, data: client } satisfies ApiResponse, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[POST /api/v1/clients]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create client' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
