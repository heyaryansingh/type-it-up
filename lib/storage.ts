/**
 * @fileoverview Supabase Storage service for document management.
 * Provides upload, download, signed URL generation, and file removal operations.
 * @module lib/storage
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** Bucket for raw uploaded documents */
export const RAW_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_RAW || "type-it-up-raw";
/** Bucket for extracted page images */
export const PAGES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_PAGES || "type-it-up-pages";
/** Bucket for extracted figures and images */
export const FIGURES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_FIGURES || "type-it-up-figures";
/** Bucket for exported documents */
export const EXPORTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_EXPORTS || "type-it-up-exports";

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Gets or creates a Supabase admin client with service role access.
 * @returns The Supabase admin client instance
 * @throws {Error} When required environment variables are not set
 */
function getAdminClient() {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }

    adminClient = createSupabaseClient(url, key);
  }

  return adminClient;
}

/**
 * Uploads a file to a Supabase storage bucket.
 * @param params - Upload parameters
 * @param params.bucket - Target bucket name
 * @param params.path - File path within the bucket
 * @param params.data - File content to upload
 * @param params.contentType - MIME type of the file
 * @param params.upsert - Whether to overwrite existing files (default: true)
 * @throws {Error} When upload fails
 */
export async function uploadToBucket(params: {
  bucket: string;
  path: string;
  data: Buffer | ArrayBuffer | Blob;
  contentType?: string;
  upsert?: boolean;
}): Promise<void> {
  const client = getAdminClient();
  const { bucket, path, data, contentType, upsert } = params;

  const { error } = await client.storage.from(bucket).upload(path, data, {
    contentType,
    upsert: upsert ?? true,
  });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }
}

/**
 * Downloads a file from a Supabase storage bucket.
 * @param params - Download parameters
 * @param params.bucket - Source bucket name
 * @param params.path - File path within the bucket
 * @returns The file contents as a Buffer
 * @throws {Error} When download fails
 */
export async function downloadFromBucket(params: {
  bucket: string;
  path: string;
}): Promise<Buffer> {
  const client = getAdminClient();
  const { bucket, path } = params;

  const { data, error } = await client.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Failed to download from Supabase Storage: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates a time-limited signed URL for secure file access.
 * @param params - URL generation parameters
 * @param params.bucket - Source bucket name
 * @param params.path - File path within the bucket
 * @param params.expiresIn - URL expiration time in seconds (default: 3600)
 * @returns The signed URL string
 * @throws {Error} When URL creation fails
 */
export async function createSignedUrl(params: {
  bucket: string;
  path: string;
  expiresIn?: number;
}): Promise<string> {
  const client = getAdminClient();
  const { bucket, path, expiresIn } = params;

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn ?? 3600);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create signed URL from Supabase Storage: ${error?.message ?? "Unknown error"}`
    );
  }

  return data.signedUrl;
}

/**
 * Removes one or more files from a Supabase storage bucket.
 * @param params - Removal parameters
 * @param params.bucket - Target bucket name
 * @param params.paths - Array of file paths to remove
 * @throws {Error} When removal fails
 */
export async function removeFromBucket(params: {
  bucket: string;
  paths: string[];
}): Promise<void> {
  const client = getAdminClient();
  const { bucket, paths } = params;

  const { error } = await client.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Failed to remove from Supabase Storage: ${error.message}`);
  }
}

/**
 * Check if storage is configured and ready
 */
export function isStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
