/**
 * @fileoverview ML Client for communicating with Hugging Face Spaces endpoint.
 * Uses Marker for PDF/image to markdown conversion.
 * @module lib/ml-client
 */

const HF_SPACE_URL = process.env.HF_SPACE_URL || process.env.NEXT_PUBLIC_HF_SPACE_URL;

/**
 * Check if the ML service is configured with a valid URL.
 *
 * @returns {boolean} True if HF_SPACE_URL is set and not the placeholder value
 * @example
 * ```typescript
 * if (isMLConfigured()) {
 *   const health = await healthCheck();
 * }
 * ```
 */
export function isMLConfigured(): boolean {
  return !!HF_SPACE_URL && HF_SPACE_URL !== "your_hf_space_url_here";
}

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
 * Check if the ML service is healthy and responding.
 *
 * @returns {Promise<HealthCheckResponse>} The health status of the ML service
 * @throws {Error} When HF_SPACE_URL environment variable is not set
 * @throws {Error} When the health check request fails
 * @example
 * ```typescript
 * const health = await healthCheck();
 * console.log(`ML service status: ${health.status}, model: ${health.model}`);
 * ```
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
 * Convert a document (PDF or image) to markdown using the ML service.
 *
 * @param {File | Blob} file - The document file to convert (PDF or image)
 * @param {string} filename - The name of the file being converted
 * @returns {Promise<ConvertResponse>} The conversion result with markdown and optional images
 * @throws {Error} When HF_SPACE_URL environment variable is not set
 * @throws {Error} When the conversion request fails
 * @example
 * ```typescript
 * const result = await convertDocument(pdfFile, 'document.pdf');
 * if (result.markdown) {
 *   console.log(result.markdown);
 * }
 * ```
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
