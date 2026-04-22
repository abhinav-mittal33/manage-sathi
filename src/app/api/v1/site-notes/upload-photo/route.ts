import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateFileKey, getPublicUrl } from '@/lib/storage';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

// POST /api/v1/site-notes/upload-photo
// Accepts multipart form-data with 'photo' field.
// Uploads to R2 server-side, returns { fileUrl }.
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const missingVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'].filter(
      (k) => !process.env[k]
    );
    if (missingVars.length > 0) {
      console.error('[POST /site-notes/upload-photo] Missing R2 env vars:', missingVars);
      return NextResponse.json(
        { success: false, error: { code: 'CONFIG_ERROR', message: `R2 not configured (missing: ${missingVars.join(', ')})` } },
        { status: 500 }
      );
    }

    const user = await requireAuth();

    const formData = await req.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No photo provided' } },
        { status: 400 }
      );
    }

    if (photo.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Photo exceeds 20 MB limit' } },
        { status: 413 }
      );
    }

    const key = generateFileKey(user.firmId, 'site-note', photo.name || 'photo.jpg');
    const buffer = Buffer.from(await photo.arrayBuffer());

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: photo.type || 'image/jpeg',
    }));

    const fileUrl = getPublicUrl(key);
    return NextResponse.json({ success: true, data: { fileUrl } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error('[POST /site-notes/upload-photo] Full error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Photo upload failed' } },
      { status: 500 }
    );
  }
}
