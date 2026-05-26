/**
 * API Error Handler Middleware
 *
 * Provides comprehensive error handling for Next.js API routes including:
 * - Error classification and status codes
 * - Request validation
 * - Rate limiting integration
 * - Logging and monitoring
 * - Structured error responses
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * API error types
 */
export enum ApiErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  type: ApiErrorType;
  statusCode: number;
  details?: unknown;
  isOperational: boolean;

  constructor(
    message: string,
    type: ApiErrorType = ApiErrorType.INTERNAL,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: {
    type: string;
    message: string;
    details?: unknown;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

/**
 * Map error types to HTTP status codes
 */
const ERROR_STATUS_MAP: Record<ApiErrorType, number> = {
  [ApiErrorType.VALIDATION]: 400,
  [ApiErrorType.INVALID_INPUT]: 400,
  [ApiErrorType.AUTHENTICATION]: 401,
  [ApiErrorType.AUTHORIZATION]: 403,
  [ApiErrorType.NOT_FOUND]: 404,
  [ApiErrorType.RATE_LIMIT]: 429,
  [ApiErrorType.TIMEOUT]: 408,
  [ApiErrorType.EXTERNAL_SERVICE]: 502,
  [ApiErrorType.INTERNAL]: 500,
};

/**
 * Create structured error response
 */
function createErrorResponse(
  error: Error | ApiError,
  request: NextRequest,
  requestId?: string
): ErrorResponse {
  const isApiError = error instanceof ApiError;

  return {
    success: false,
    error: {
      type: isApiError ? error.type : ApiErrorType.INTERNAL,
      message: error.message,
      details: isApiError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
      requestId,
    },
  };
}

/**
 * Log error for monitoring
 */
function logError(
  error: Error | ApiError,
  request: NextRequest,
  requestId?: string
): void {
  const isApiError = error instanceof ApiError;
  const severity = isApiError && error.isOperational ? 'warning' : 'error';

  console[severity]('[API Error]', {
    type: isApiError ? error.type : 'UNKNOWN',
    message: error.message,
    path: request.nextUrl.pathname,
    method: request.method,
    requestId,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle API errors and return appropriate response
 */
export function handleApiError(
  error: Error | ApiError,
  request: NextRequest,
  requestId?: string
): NextResponse<ErrorResponse> {
  // Log the error
  logError(error, request, requestId);

  // Create error response
  const errorResponse = createErrorResponse(error, request, requestId);

  // Determine status code
  const statusCode = error instanceof ApiError
    ? error.statusCode
    : ERROR_STATUS_MAP[ApiErrorType.INTERNAL];

  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler<T = unknown>(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse<T | ErrorResponse>> => {
    const requestId = crypto.randomUUID();

    try {
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof Error) {
        return handleApiError(error, request, requestId);
      }

      // Handle non-Error throws
      const unknownError = new ApiError(
        'An unknown error occurred',
        ApiErrorType.INTERNAL,
        500,
        error
      );

      return handleApiError(unknownError, request, requestId);
    }
  };
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: unknown) => T
): Promise<T> {
  try {
    const body = await request.json();
    return validator(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError(
        'Invalid JSON in request body',
        ApiErrorType.INVALID_INPUT,
        400
      );
    }
    throw error;
  }
}

/**
 * Validate required query parameters
 */
export function validateQueryParams(
  request: NextRequest,
  requiredParams: string[]
): Record<string, string> {
  const { searchParams } = request.nextUrl;
  const params: Record<string, string> = {};
  const missing: string[] = [];

  for (const param of requiredParams) {
    const value = searchParams.get(param);
    if (!value) {
      missing.push(param);
    } else {
      params[param] = value;
    }
  }

  if (missing.length > 0) {
    throw new ApiError(
      `Missing required query parameters: ${missing.join(', ')}`,
      ApiErrorType.VALIDATION,
      400,
      { missing }
    );
  }

  return params;
}

/**
 * Validate file upload
 */
export async function validateFileUpload(
  request: NextRequest,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
    fieldName?: string;
  } = {}
): Promise<File> {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
    fieldName = 'file',
  } = options;

  const formData = await request.formData();
  const file = formData.get(fieldName) as File | null;

  if (!file) {
    throw new ApiError(
      `No file provided in field '${fieldName}'`,
      ApiErrorType.VALIDATION,
      400
    );
  }

  // Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new ApiError(
      `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      ApiErrorType.VALIDATION,
      400,
      { size: file.size, maxSize: maxSizeBytes }
    );
  }

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    throw new ApiError(
      `File type '${file.type}' not allowed`,
      ApiErrorType.VALIDATION,
      400,
      { type: file.type, allowedTypes }
    );
  }

  return file;
}

/**
 * Check if request is authenticated (placeholder - implement based on your auth)
 */
export function requireAuth(request: NextRequest): void {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    throw new ApiError(
      'Authentication required',
      ApiErrorType.AUTHENTICATION,
      401
    );
  }

  // Add actual authentication logic here
  // This is a placeholder
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ApiError(
        `${operation} timed out after ${timeoutMs}ms`,
        ApiErrorType.TIMEOUT,
        408
      ));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Retry logic for external service calls
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    operationName = 'External service call',
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new ApiError(
    `${operationName} failed after ${maxRetries} attempts`,
    ApiErrorType.EXTERNAL_SERVICE,
    502,
    { lastError: lastError?.message }
  );
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(
  json: string,
  defaultValue?: T
): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ApiError(
      'Invalid JSON format',
      ApiErrorType.INVALID_INPUT,
      400,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}
