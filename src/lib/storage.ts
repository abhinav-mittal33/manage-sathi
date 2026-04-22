import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? 'manage-sathi-files';
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 60): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await r2Client.send(command);
}

export function keyFromPublicUrl(photoUrl: string): string | null {
  const base = PUBLIC_URL;
  if (!base || !photoUrl.startsWith(base + '/')) return null;
  return photoUrl.slice(base.length + 1);
}

export function generateFileKey(
  firmId: string,
  type: 'drawing' | 'site-note' | 'misc',
  filename: string
): string {
  const timestamp = Date.now();
  const ext = filename.split('.').pop() ?? 'bin';
  return `${firmId}/${type}/${timestamp}-${crypto.randomUUID()}.${ext}`;
}
