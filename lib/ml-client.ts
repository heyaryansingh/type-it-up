/**
 * ML Client for communicating with Hugging Face Spaces endpoint
 * Uses Marker for PDF/image to markdown conversion
 */

const HF_SPACE_URL = process.env.HF_SPACE_URL || process.env.NEXT_PUBLIC_HF_SPACE_URL;

export interface HealthCheckResponse {
  status: string;
  model: string;
  version: string;
}

export interface ConvertResponse {
  status: string;
  markdown?: string;
  images?: { path: string; data: string }[];
  error?: string;
}

/**
 * Check if the ML service is healthy and responding
 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  if (!HF_SPACE_URL) {
    throw new Error("HF_SPACE_URL environment variable is not set");
  }

  const response = await fetch(`${HF_SPACE_URL}/health`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ML service health check failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convert a document (PDF or image) to markdown using the ML service
 */
export async function convertDocument(
  file: File | Blob,
  filename: string
): Promise<ConvertResponse> {
  if (!HF_SPACE_URL) {
    throw new Error("HF_SPACE_URL environment variable is not set");
  }

  const formData = new FormData();
  formData.append("file", file, filename);

  const response = await fetch(`${HF_SPACE_URL}/convert`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML conversion failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}
