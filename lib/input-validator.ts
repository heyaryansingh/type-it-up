/**
 * Input validation utilities for image uploads and document processing.
 *
 * Provides comprehensive validation for:
 * - File type and format validation
 * - Image dimension and size checks
 * - Content quality assessment
 * - Security validation (malicious files)
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    fileType: string;
    size: number;
    dimensions?: { width: number; height: number };
  };
}

export interface ValidationOptions {
  allowedTypes?: string[];
  maxSizeMB?: number;
  minSizeMB?: number;
  maxDimensions?: { width: number; height: number };
  minDimensions?: { width: number; height: number };
  requireSquareAspectRatio?: boolean;
  aspectRatioTolerance?: number;
}

const DEFAULT_VALIDATION_OPTIONS: Required<ValidationOptions> = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSizeMB: 10,
  minSizeMB: 0.01,
  maxDimensions: { width: 4096, height: 4096 },
  minDimensions: { width: 100, height: 100 },
  requireSquareAspectRatio: false,
  aspectRatioTolerance: 0.1,
};

/**
 * Validate an image file for upload and processing.
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = await validateImageFile(file, {
 *   maxSizeMB: 5,
 *   minDimensions: { width: 200, height: 200 }
 * });
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export async function validateImageFile(
  file: File,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. File type validation
  if (!opts.allowedTypes.includes(file.type)) {
    errors.push(
      `Invalid file type: ${file.type}. Allowed types: ${opts.allowedTypes.join(', ')}`
    );
  }

  // 2. File size validation
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > opts.maxSizeMB) {
    errors.push(`File size (${sizeMB.toFixed(2)}MB) exceeds maximum allowed (${opts.maxSizeMB}MB)`);
  }

  if (sizeMB < opts.minSizeMB) {
    errors.push(`File size (${sizeMB.toFixed(2)}MB) is below minimum (${opts.minSizeMB}MB)`);
  }

  // 3. Size warnings
  if (sizeMB > 5) {
    warnings.push('Large file size may result in slower processing and higher API costs');
  }

  // 4. Dimension validation (requires loading image)
  let dimensions: { width: number; height: number } | undefined;

  try {
    dimensions = await getImageDimensions(file);

    if (dimensions.width > opts.maxDimensions.width || dimensions.height > opts.maxDimensions.height) {
      errors.push(
        `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum (${opts.maxDimensions.width}x${opts.maxDimensions.height})`
      );
    }

    if (dimensions.width < opts.minDimensions.width || dimensions.height < opts.minDimensions.height) {
      errors.push(
        `Image dimensions (${dimensions.width}x${dimensions.height}) below minimum (${opts.minDimensions.width}x${opts.minDimensions.height})`
      );
    }

    // 5. Aspect ratio check
    if (opts.requireSquareAspectRatio) {
      const aspectRatio = dimensions.width / dimensions.height;
      const deviation = Math.abs(aspectRatio - 1.0);

      if (deviation > opts.aspectRatioTolerance) {
        errors.push('Image must have a square aspect ratio (1:1)');
      }
    }

    // 6. Dimension warnings
    if (dimensions.width > 3000 || dimensions.height > 3000) {
      warnings.push('Very high resolution image. Consider resizing to reduce processing time.');
    }
  } catch (error) {
    errors.push(`Failed to load image dimensions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      fileType: file.type,
      size: file.size,
      dimensions,
    },
  };
}

/**
 * Get image dimensions without fully loading the image.
 *
 * @param file - Image file
 * @returns Promise resolving to width and height
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Validate multiple files in batch.
 *
 * @param files - Array of files to validate
 * @param options - Validation options
 * @returns Array of validation results
 *
 * @example
 * ```typescript
 * const files = Array.from(event.target.files);
 * const results = await validateBatch(files);
 *
 * const validFiles = files.filter((_, i) => results[i].isValid);
 * const invalidFiles = files.filter((_, i) => !results[i].isValid);
 * ```
 */
export async function validateBatch(
  files: File[],
  options: ValidationOptions = {}
): Promise<ValidationResult[]> {
  return Promise.all(files.map((file) => validateImageFile(file, options)));
}

/**
 * Check if file name contains suspicious patterns.
 *
 * @param filename - File name to check
 * @returns True if filename is suspicious
 */
export function isSuspiciousFilename(filename: string): boolean {
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.js$/i,
    /\.vbs$/i,
    /\.sh$/i,
    /\.\./,  // Path traversal
    /[<>:"|?*]/,  // Invalid filename characters
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(filename));
}

/**
 * Sanitize filename for safe storage.
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 *
 * @example
 * ```typescript
 * const safe = sanitizeFilename('my file (1).png'); // 'my-file-1.png'
 * ```
 */
export function sanitizeFilename(filename: string): string {
  // Get file extension
  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.substring(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.substring(lastDot) : '';

  // Sanitize name
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')  // Replace invalid chars with dash
    .replace(/-+/g, '-')           // Collapse multiple dashes
    .replace(/^-|-$/g, '');        // Remove leading/trailing dashes

  return sanitized + ext.toLowerCase();
}

/**
 * Check if file is likely a valid image based on magic numbers.
 *
 * Reads first few bytes to verify file signature matches declared type.
 *
 * @param file - File to check
 * @returns Promise resolving to true if file appears valid
 */
export async function verifyImageFormat(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const arr = new Uint8Array(e.target?.result as ArrayBuffer);

      // Check magic numbers for common image formats
      const isPNG = arr.length >= 4 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47;
      const isJPEG = arr.length >= 3 && arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff;
      const isGIF = arr.length >= 6 &&
        arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 &&
        arr[3] === 0x38 && (arr[4] === 0x37 || arr[4] === 0x39) && arr[5] === 0x61;
      const isWEBP = arr.length >= 12 &&
        arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46 &&
        arr[8] === 0x57 && arr[9] === 0x45 && arr[10] === 0x42 && arr[11] === 0x50;

      resolve(isPNG || isJPEG || isGIF || isWEBP);
    };

    reader.onerror = () => {
      resolve(false);
    };

    // Read first 12 bytes
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Get summary of validation results for multiple files.
 *
 * @param results - Array of validation results
 * @returns Summary statistics
 */
export function getValidationSummary(results: ValidationResult[]): {
  total: number;
  valid: number;
  invalid: number;
  hasWarnings: number;
  totalErrors: number;
  totalWarnings: number;
} {
  return {
    total: results.length,
    valid: results.filter((r) => r.isValid).length,
    invalid: results.filter((r) => !r.isValid).length,
    hasWarnings: results.filter((r) => r.warnings.length > 0).length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
  };
}
