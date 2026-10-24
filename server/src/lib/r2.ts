import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Render's free web service disk is ephemeral — it's wiped on every
// restart (idle spin-down, redeploy), so a photo "uploaded" fine but
// silently vanished the next time anyone tried to view it (same symptom
// everywhere: Home card, story viewer, saved album — all pointed at the
// same now-missing local file). Cloudflare R2 (S3-compatible, free tier,
// no egress fees) replaces local disk as the actual storage; `storageKey`
// in the DB is unchanged — it's just the R2 object key now instead of a
// filename under server/uploads.
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
// The bucket's public base URL (R2.dev dev URL, or a custom domain) — no
// trailing slash. r2PublicUrl() just appends "/<key>" to this.
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, '');

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
  console.warn(
    '[r2] One or more R2_* env vars are missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL) — photo uploads will fail until these are set on Render.'
  );
}

const client = new S3Client({
  region: 'auto',
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
});

export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteFromR2(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function r2PublicUrl(key: string): string {
  return `${publicBaseUrl}/${key}`;
}
