import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getDrawingById } from '@/lib/dal/drawing.dal';
import { generateFileKey, getPublicUrl } from '@/lib/storage';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

type RouteParams = { params: Promise<{ id: string; drawingId: string }> };

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

export const config = { api: { bodyParser: false } };

// POST /api/v1/projects/[id]/drawings/[drawingId]/upload
// Accepts multipart form data with 'file' field.
// Uploads directly to R2 server-side — no CORS presign dance needed.
export async function POST(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const missingVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].filter(
      (k) => !process.env[k]
    );
    if (missingVars.length > 0) {
      console.error('[POST /drawings/:drawingId/upload] Missing R2 env vars:', missingVars);
      return NextResponse.json(
        { success: false, error: { code: 'CONFIG_ERROR', message: `R2 storage not configured (missing: ${missingVars.join(', ')})` } },
        { status: 500 }
      );
    }

    const user = await requireAuth();
    const { id: projectId, drawingId } = await params;

    const drawing = await getDrawingById(drawingId, user.firmId);
    if (!drawing || drawing.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'File exceeds 50 MB limit' } },
        { status: 413 }
      );
    }

    const key = generateFileKey(user.firmId, 'drawing', file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }));

    const fileUrl = getPublicUrl(key);

    return NextResponse.json({ success: true, data: { fileUrl, key } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /drawings/:drawingId/upload] Full error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Upload failed' } },
      { status: 500 }
    );
  }
}
