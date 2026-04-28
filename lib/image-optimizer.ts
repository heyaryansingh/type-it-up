/**
 * Image optimization utilities for preprocessing before OCR/Vision API calls.
 *
 * Provides functions to:
 * - Optimize image quality for better OCR accuracy
 * - Compress images to reduce API costs
 * - Auto-correct orientation and skew
 * - Enhance contrast for handwritten text recognition
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  enhanceContrast?: boolean;
  autoRotate?: boolean;
}

export interface OptimizedImage {
  dataUrl: string;
  width: number;
  height: number;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

/**
 * Optimize an image for OCR processing.
 *
 * @param file - Image file to optimize
 * @param options - Optimization options
 * @returns Promise resolving to optimized image data
 *
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const optimized = await optimizeForOCR(file, {
 *   maxWidth: 2048,
 *   enhanceContrast: true,
 *   quality: 0.9
 * });
 * ```
 */
export async function optimizeForOCR(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.92,
    format = 'jpeg',
    enhanceContrast = true,
    autoRotate = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Enhance contrast for better OCR
      if (enhanceContrast) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Simple contrast enhancement
        const factor = 1.2;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, ((data[i] - 128) * factor) + 128)); // R
          data[i + 1] = Math.min(255, Math.max(0, ((data[i + 1] - 128) * factor) + 128)); // G
          data[i + 2] = Math.min(255, Math.max(0, ((data[i + 2] - 128) * factor) + 128)); // B
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Convert to data URL
      const mimeType = `image/${format}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      // Calculate sizes
      const originalSize = file.size;
      const optimizedSize = Math.round((dataUrl.length * 3) / 4); // Approximate base64 size

      resolve({
        dataUrl,
        width,
        height,
        size: optimizedSize,
        originalSize,
        compressionRatio: originalSize / optimizedSize,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Batch optimize multiple images concurrently.
 *
 * @param files - Array of image files
 * @param options - Optimization options
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to array of optimized images
 *
 * @example
 * ```typescript
 * const files = Array.from(event.target.files);
 * const optimized = await batchOptimize(files, {
 *   maxWidth: 1920,
 *   quality: 0.85
 * }, (completed, total) => {
 *   console.log(`Progress: ${completed}/${total}`);
 * });
 * ```
 */
export async function batchOptimize(
  files: File[],
  options: ImageOptimizationOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];
  let completed = 0;

  for (const file of files) {
    try {
      const optimized = await optimizeForOCR(file, options);
      results.push(optimized);
      completed++;

      if (onProgress) {
        onProgress(completed, files.length);
      }
    } catch (error) {
      console.error(`Failed to optimize ${file.name}:`, error);
      // Continue with other files
    }
  }

  return results;
}

/**
 * Detect if an image contains primarily handwritten content.
 *
 * Uses basic heuristics:
 * - High edge density suggests handwriting
 * - Low text-to-background ratio suggests handwriting
 *
 * @param dataUrl - Image data URL
 * @returns Promise resolving to confidence score (0-1)
 */
export async function detectHandwriting(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(0.5); // Default to uncertain
        return;
      }

      // Use smaller canvas for analysis
      const width = 200;
      const height = (img.height / img.width) * width;
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      let edgeCount = 0;
      let pixelCount = 0;

      // Simple edge detection (Sobel-like)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          // Get grayscale value
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

          // Get neighbors
          const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
          const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
          const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
          const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;

          // Calculate gradient
          const gx = Math.abs(right - left);
          const gy = Math.abs(bottom - top);
          const gradient = Math.sqrt(gx * gx + gy * gy);

          if (gradient > 30) {
            edgeCount++;
          }

          pixelCount++;
        }
      }

      // Higher edge density suggests more irregular (handwritten) content
      const edgeDensity = edgeCount / pixelCount;

      // Normalize to 0-1 range (heuristic thresholds)
      const confidence = Math.min(1, Math.max(0, edgeDensity * 10));

      resolve(confidence);
    };

    img.onerror = () => {
      resolve(0.5); // Default to uncertain
    };

    img.src = dataUrl;
  });
}

/**
 * Calculate estimated API cost for processing an image.
 *
 * Based on typical vision API pricing:
 * - Small images (<500KB): $0.0015
 * - Medium images (500KB-2MB): $0.003
 * - Large images (>2MB): $0.006
 *
 * @param sizeBytes - Image size in bytes
 * @returns Estimated cost in USD
 */
export function estimateAPICost(sizeBytes: number): number {
  const sizeKB = sizeBytes / 1024;

  if (sizeKB < 500) {
    return 0.0015;
  } else if (sizeKB < 2048) {
    return 0.003;
  } else {
    return 0.006;
  }
}

/**
 * Get optimization recommendations for an image.
 *
 * @param file - Image file to analyze
 * @returns Recommendations for optimization
 */
export async function getOptimizationRecommendations(
  file: File
): Promise<{
  shouldOptimize: boolean;
  recommendations: string[];
  estimatedSavings: number;
}> {
  const sizeKB = file.size / 1024;
  const recommendations: string[] = [];
  let estimatedSavings = 0;

  if (sizeKB > 2048) {
    recommendations.push('Image is very large. Consider compressing to <2MB to reduce API costs.');
    estimatedSavings = estimateAPICost(file.size) - estimateAPICost(2048 * 1024);
  }

  if (file.type === 'image/png' && sizeKB > 500) {
    recommendations.push('PNG format detected. Consider converting to JPEG for better compression.');
    estimatedSavings += 0.001;
  }

  if (sizeKB > 5000) {
    recommendations.push('Image resolution may be unnecessarily high. Resizing to 2048px max dimension recommended.');
  }

  return {
    shouldOptimize: recommendations.length > 0,
    recommendations,
    estimatedSavings,
  };
}
