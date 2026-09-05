import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@/lib/env";

/**
 * Works with any S3-compatible object storage — Cloudflare R2, Supabase
 * Storage, Backblaze B2, MinIO, etc. — configured entirely through
 * STORAGE_* env vars (see lib/env.ts). Nothing here is Cloudflare-specific
 * despite the filename/original naming.
 */

let cachedClient: S3Client | undefined;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const env = getServerEnv();
  cachedClient = new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    },
  });
  return cachedClient;
}

/** Uploads a file to the private storage bucket. Object keys should follow
 * the `requests/{requestId}/...` convention documented in the README. */
export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  const env = getServerEnv();
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/** Fetches an object's raw bytes directly (server-side use only, e.g. text
 * extraction before AI processing). For anything a browser downloads, use
 * getSignedDownloadUrl instead so credentials never pass through this app. */
export async function getObjectBytes(key: string): Promise<Uint8Array> {
  const env = getServerEnv();
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: env.STORAGE_BUCKET_NAME, Key: key })
  );
  const body = result.Body;
  if (!body) {
    throw new Error(`Storage object has no body: ${key}`);
  }
  const bytes = await body.transformToByteArray();
  return bytes;
}

/** Returns a time-limited signed URL for private download. Never expose raw
 * bucket URLs — every customer/admin download must go through this. */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const env = getServerEnv();
  const command = new GetObjectCommand({
    Bucket: env.STORAGE_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  const env = getServerEnv();
  await getClient().send(
    new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET_NAME, Key: key })
  );
}

export function originalCvKey(requestId: string, filename: string): string {
  return `requests/${requestId}/original-${filename}`;
}

export function tailoredCvPdfKey(requestId: string): string {
  return `requests/${requestId}/tailored-cv.pdf`;
}

export function tailoredCvDocxKey(requestId: string): string {
  return `requests/${requestId}/tailored-cv.docx`;
}

export function coverLetterPdfKey(requestId: string): string {
  return `requests/${requestId}/cover-letter.pdf`;
}
