/**
 * @fileoverview Input Validation Utilities
 * @module lib/input-validation
 *
 * Comprehensive validation for file uploads, document content,
 * and user input to ensure data integrity and security.
 *
 * @example
 * ```typescript
 * import { validateImageFile, validateDocumentContent } from './input-validation';
 *
 * const validation = validateImageFile(file);
 * if (!validation.isValid) {
 *   console.error(validation.errors);
 * }
 * ```
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImageValidationOptions {
  maxSizeBytes?: number;
  allowedFormats?: string[];
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface DocumentValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowedCharacters?: RegExp;
  requireLatex?: boolean;
}

const DEFAULT_IMAGE_OPTIONS: Required<ImageValidationOptions> = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedFormats: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  minWidth: 100,
  minHeight: 100,
  maxWidth: 8000,
  maxHeight: 8000,
};

const DEFAULT_DOCUMENT_OPTIONS: Required<DocumentValidationOptions> = {
  maxLength: 1000000, // 1M characters
  minLength: 1,
  allowedCharacters: /.*/,
  requireLatex: false,
};

/**
 * Validate uploaded image file
 */
export function validateImageFile(
  file: File,
  options: ImageValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!opts.allowedFormats.includes(file.type)) {
    errors.push(
      `Invalid file format. Allowed: ${opts.allowedFormats.join(", ")}`
    );
  }

  // Check file size
  if (file.size > opts.maxSizeBytes) {
    errors.push(
      `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(
        opts.maxSizeBytes /
        1024 /
        1024
      ).toFixed(2)}MB`
    );
  }

  // Warn if file is very small (might be low quality)
  if (file.size < 50 * 1024) {
    warnings.push(
      "File size is very small. Image quality may affect OCR accuracy."
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate image dimensions (requires creating image element)
 */
export async function validateImageDimensions(
  file: File,
  options: ImageValidationOptions = {}
): Promise<ValidationResult> {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      if (img.width < opts.minWidth) {
        errors.push(`Image width ${img.width}px is below minimum ${opts.minWidth}px`);
      }

      if (img.height < opts.minHeight) {
        errors.push(`Image height ${img.height}px is below minimum ${opts.minHeight}px`);
      }

      if (img.width > opts.maxWidth) {
        errors.push(`Image width ${img.width}px exceeds maximum ${opts.maxWidth}px`);
      }

      if (img.height > opts.maxHeight) {
        errors.push(`Image height ${img.height}px exceeds maximum ${opts.maxHeight}px`);
      }

      // Warn about aspect ratio extremes
      const aspectRatio = img.width / img.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        warnings.push(
          `Unusual aspect ratio (${aspectRatio.toFixed(2)}). OCR may be less accurate.`
        );
      }

      resolve({
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        isValid: false,
        errors: ["Failed to load image. File may be corrupted."],
        warnings: [],
      });
    };

    img.src = url;
  });
}

/**
 * Validate document text content
 */
export function validateDocumentContent(
  content: string,
  options: DocumentValidationOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_DOCUMENT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check length
  if (content.length > opts.maxLength) {
    errors.push(
      `Content length ${content.length} exceeds maximum ${opts.maxLength}`
    );
  }

  if (content.length < opts.minLength) {
    errors.push(
      `Content length ${content.length} is below minimum ${opts.minLength}`
    );
  }

  // Check allowed characters
  if (!opts.allowedCharacters.test(content)) {
    errors.push("Content contains invalid characters");
  }

  // Check for LaTeX if required
  if (opts.requireLatex) {
    const hasLatex = /\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\)/.test(content);
    if (!hasLatex) {
      warnings.push("No LaTeX expressions detected in content");
    }
  }

  // Warn about suspicious patterns
  if (content.includes("\x00")) {
    warnings.push("Content contains null bytes");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate LaTeX expression
 */
export function validateLatex(latex: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for balanced delimiters
  const openBraces = (latex.match(/\{/g) || []).length;
  const closeBraces = (latex.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push(
      `Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`
    );
  }

  const openBrackets = (latex.match(/\[/g) || []).length;
  const closeBrackets = (latex.match(/\]/g) || []).length;

  if (openBrackets !== closeBrackets) {
    errors.push(
      `Unbalanced brackets: ${openBrackets} opening, ${closeBrackets} closing`
    );
  }

  const openParens = (latex.match(/\(/g) || []).length;
  const closeParens = (latex.match(/\)/g) || []).length;

  if (openParens !== closeParens) {
    warnings.push(
      `Unbalanced parentheses: ${openParens} opening, ${closeParens} closing`
    );
  }

  // Check for common LaTeX errors
  if (latex.includes("\\begin") && !latex.includes("\\end")) {
    errors.push("\\begin without matching \\end");
  }

  if (latex.includes("\\left") && !latex.includes("\\right")) {
    warnings.push("\\left without matching \\right");
  }

  // Check for undefined commands (basic check)
  const commands = latex.match(/\\[a-zA-Z]+/g) || [];
  const suspiciousCommands = commands.filter(
    (cmd) =>
      cmd.length > 20 || // Very long command names
      /\\[A-Z]{2,}/.test(cmd) // All caps commands (unusual)
  );

  if (suspiciousCommands.length > 0) {
    warnings.push(
      `Suspicious commands: ${suspiciousCommands.slice(0, 3).join(", ")}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate batch upload
 */
export function validateBatch(
  files: File[],
  options: ImageValidationOptions = {}
): { overall: ValidationResult; individual: Map<string, ValidationResult> } {
  const individual = new Map<string, ValidationResult>();
  const overallErrors: string[] = [];
  const overallWarnings: string[] = [];

  // Check total file count
  if (files.length === 0) {
    overallErrors.push("No files provided");
  }

  if (files.length > 100) {
    overallWarnings.push(
      `Large batch (${files.length} files). Processing may take time.`
    );
  }

  // Validate each file
  let totalSize = 0;
  for (const file of files) {
    const result = validateImageFile(file, options);
    individual.set(file.name, result);

    if (!result.isValid) {
      overallErrors.push(`${file.name}: ${result.errors.join(", ")}`);
    }

    totalSize += file.size;
  }

  // Check total batch size
  const maxBatchSize = 100 * 1024 * 1024; // 100MB
  if (totalSize > maxBatchSize) {
    overallWarnings.push(
      `Total batch size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds recommended ${(maxBatchSize / 1024 / 1024).toFixed(2)}MB`
    );
  }

  return {
    overall: {
      isValid: overallErrors.length === 0,
      errors: overallErrors,
      warnings: overallWarnings,
    },
    individual,
  };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate filename for safe filesystem operations
 */
export function validateFilename(filename: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for dangerous characters
  const dangerousChars = /[<>:"|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) {
    errors.push("Filename contains invalid characters");
  }

  // Check for path traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    errors.push("Filename contains path traversal characters");
  }

  // Check length
  if (filename.length > 255) {
    errors.push("Filename exceeds 255 characters");
  }

  if (filename.length === 0) {
    errors.push("Filename is empty");
  }

  // Warn about special names
  const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "LPT1"];
  const nameWithoutExt = filename.split(".")[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    warnings.push(`"${filename}" is a reserved filename on Windows`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate URL for safe external requests
 */
export function validateUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = new URL(url);

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(parsed.protocol)) {
      errors.push(`Invalid protocol: ${parsed.protocol}. Only HTTP/HTTPS allowed.`);
    }

    // Warn about HTTP (not HTTPS)
    if (parsed.protocol === "http:") {
      warnings.push("Using insecure HTTP protocol. HTTPS is recommended.");
    }

    // Block localhost/private IPs (basic SSRF protection)
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname === "[::1]"
    ) {
      errors.push("Local/private network URLs are not allowed");
    }

  } catch (e) {
    errors.push("Invalid URL format");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
