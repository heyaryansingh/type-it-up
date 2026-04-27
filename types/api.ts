/**
 * API Response Types for Type-It-Up
 *
 * Centralized type definitions for all API endpoints to ensure
 * type safety across the application.
 */

export interface HealthCheckResponse {
  status: "ok" | "error";
  database?: "connected" | "disconnected";
  timestamp?: string;
  message?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  text?: string;
  latex?: string;
  markdown?: string;
  error?: string;
  processingTime?: number;
}

export interface UploadResponse {
  success: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  format: "pdf" | "latex" | "markdown" | "archive";
  downloadUrl?: string;
  error?: string;
}

export interface ProcessResponse {
  success: boolean;
  result?: {
    text: string;
    latex: string;
    markdown: string;
    diagrams?: string[];
  };
  error?: string;
  warnings?: string[];
}

export interface SystemStatusResponse {
  status: "healthy" | "degraded" | "down";
  services: {
    ocr: ServiceStatus;
    latex: ServiceStatus;
    export: ServiceStatus;
    storage: ServiceStatus;
  };
  uptime: number;
  timestamp: string;
}

export interface ServiceStatus {
  status: "up" | "down" | "degraded";
  latency?: number;
  lastCheck: string;
  error?: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: unknown): response is ApiError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ApiError).error === "string"
  );
}

/**
 * Standard success response wrapper
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Standard error response wrapper
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

/**
 * Generic API response type
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
