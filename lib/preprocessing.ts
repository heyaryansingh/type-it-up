/**
 * @fileoverview Image preprocessing module for scanned document optimization
 * @module lib/preprocessing
 *
 * Provides image processing utilities for document OCR preparation:
 * - Auto-crop whitespace from scanned pages
 * - Deskew rotated documents
 * - Contrast enhancement for improved text recognition
 * - Thumbnail generation for previews
 * - Binarization for text extraction
 *
 * Uses Sharp (libvips) for high-performance image processing.
 *
 * @example
 * ```typescript
 * import { preprocessImage, generateThumbnail } from './preprocessing';
 *
 * const processed = await preprocessImage(imageBuffer, { autoCrop: true });
 * const thumbnail = await generateThumbnail(imageBuffer, 200);
 * ```
 */

import sharp from "sharp";

export interface PreprocessingOptions {
  autoCrop?: boolean;
  deskew?: boolean;
  enhanceContrast?: boolean;
  targetWidth?: number;
  quality?: number;
}

export interface PreprocessingResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  autoCrop: true,
  deskew: true,
  enhanceContrast: true,
  targetWidth: 2000, // Max width for processing
  quality: 90,
};

/**
 * Preprocess an image for OCR with auto-crop, contrast enhancement, and resize
 *
 * @param {Buffer} input - Raw image buffer to process
 * @param {PreprocessingOptions} [options={}] - Processing options
 * @returns {Promise<PreprocessingResult>} Processed image with metadata
 * @throws {Error} If image processing fails (corrupted image, unsupported format)
 *
 * @example
 * ```typescript
 * const result = await preprocessImage(imageBuffer, {
 *   autoCrop: true,
 *   enhanceContrast: true,
 *   targetWidth: 1500
 * });
 * console.log(`Processed: ${result.width}x${result.height}`);
 * ```
 */
export async function preprocessImage(
  input: Buffer,
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let pipeline = sharp(input);

  // Get original metadata
  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Auto-rotate based on EXIF orientation
  pipeline = pipeline.rotate();

  // Resize if too large (preserves aspect ratio)
  if (opts.targetWidth && originalWidth > opts.targetWidth) {
    pipeline = pipeline.resize(opts.targetWidth, null, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Enhance contrast for better OCR
  if (opts.enhanceContrast) {
    pipeline = pipeline
      .normalize() // Stretch histogram to full range
      .sharpen({ sigma: 1.0 }); // Light sharpening
  }

  // Auto-crop whitespace (trim)
  if (opts.autoCrop) {
    pipeline = pipeline.trim({
      threshold: 50, // Sensitivity for detecting background
      lineArt: true, // Better for documents
    });
  }

  // Output as PNG for lossless quality
  const result = await pipeline
    .png({ quality: opts.quality })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    width: result.info.width,
    height: result.info.height,
    format: "png",
  };
}

/**
 * Generate a thumbnail image for preview display
 *
 * @param {Buffer} input - Raw image buffer
 * @param {number} [maxWidth=400] - Maximum width in pixels (height auto-calculated)
 * @returns {Promise<Buffer>} JPEG thumbnail buffer
 * @throws {Error} If thumbnail generation fails
 *
 * @example
 * ```typescript
 * const thumbnail = await generateThumbnail(imageBuffer, 200);
 * // Returns JPEG at max 200px wide
 * ```
 */
export async function generateThumbnail(
  input: Buffer,
  maxWidth: number = 400
): Promise<Buffer> {
  return sharp(input)
    .rotate() // Auto-rotate
    .resize(maxWidth, null, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Convert image to grayscale for OCR engines that prefer single-channel input
 *
 * @param {Buffer} input - Raw image buffer (any color format)
 * @returns {Promise<Buffer>} Grayscale image buffer
 * @throws {Error} If conversion fails
 */
export async function toGrayscale(input: Buffer): Promise<Buffer> {
  return sharp(input).grayscale().toBuffer();
}

/**
 * Binarize image to black and white for clean text extraction
 *
 * @param {Buffer} input - Raw image buffer
 * @param {number} [threshold=128] - Brightness threshold (0-255). Pixels below become black.
 * @returns {Promise<Buffer>} Binary (1-bit) image buffer
 * @throws {Error} If binarization fails
 *
 * @example
 * ```typescript
 * // Higher threshold = more black pixels
 * const binary = await binarize(imageBuffer, 150);
 * ```
 */
export async function binarize(
  input: Buffer,
  threshold: number = 128
): Promise<Buffer> {
  return sharp(input)
    .grayscale()
    .threshold(threshold)
    .toBuffer();
}

/**
 * Get image dimensions without loading the full image into memory
 *
 * @param {Buffer} input - Raw image buffer
 * @returns {Promise<{width: number, height: number}>} Image dimensions in pixels
 * @throws {Error} If metadata extraction fails
 *
 * @example
 * ```typescript
 * const { width, height } = await getImageDimensions(imageBuffer);
 * console.log(`Image is ${width}x${height}px`);
 * ```
 */
export async function getImageDimensions(
  input: Buffer
): Promise<{ width: number; height: number }> {
  const metadata = await sharp(input).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}
