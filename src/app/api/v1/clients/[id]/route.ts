import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { updateClientSchema } from '@/lib/validations/client';
import { getClient, updateClient, deleteClient } from '@/lib/services/client.service';
import type { ApiResponse } from '@/types';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/v1/clients/[id]
export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;
    const client = await getClient(id, auth.firmId);
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } } satisfies ApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: client } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[GET /api/v1/clients/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch client' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// PUT /api/v1/clients/[id]
export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const body: unknown = await request.json();
    const parsed = updateClientSchema.safeParse(body);
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

    const client = await updateClient(id, auth.firmId, parsed.data);
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } } satisfies ApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: client } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[PUT /api/v1/clients/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update client' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// DELETE /api/v1/clients/[id]
export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const auth = await requireAuth();
    const { id } = await params;

    const deleted = await deleteClient(id, auth.firmId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } } satisfies ApiResponse,
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: null } satisfies ApiResponse);
  } catch (err) {
    if (err instanceof Response) return NextResponse.json(await err.json(), { status: err.status });
    console.error('[DELETE /api/v1/clients/[id]]', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete client' } } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
