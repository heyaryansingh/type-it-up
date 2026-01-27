import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Default bucket names - can be overridden via env vars
export const RAW_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_RAW || "type-it-up-raw";
export const PAGES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_PAGES || "type-it-up-pages";
export const FIGURES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_FIGURES || "type-it-up-figures";
export const EXPORTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_EXPORTS || "type-it-up-exports";

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

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
