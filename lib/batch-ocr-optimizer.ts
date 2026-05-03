/**
 * @fileoverview Batch OCR Optimization - Intelligent batching and parallel processing
 * @module lib/batch-ocr-optimizer
 *
 * Optimizes OCR processing for large documents by:
 * - Intelligent batching based on image complexity
 * - Parallel processing with configurable concurrency
 * - Progress tracking and cancellation support
 * - Automatic retry with exponential backoff
 *
 * @example
 * ```typescript
 * import { BatchOCRProcessor } from './batch-ocr-optimizer';
 *
 * const processor = new BatchOCRProcessor({ maxConcurrency: 4 });
 * const results = await processor.processImages(images, {
 *   onProgress: (progress) => console.log(`${progress}% complete`),
 * });
 * ```
 */

export interface OCRImage {
  id: string;
  data: string; // base64 or URL
  pageNumber: number;
  complexity?: number; // 0-1 score
}

export interface OCRResult {
  id: string;
  pageNumber: number;
  text: string;
  confidence: number;
  processingTime: number;
  error?: string;
}

export interface BatchOCROptions {
  maxConcurrency?: number; // Max parallel OCR requests
  retryAttempts?: number; // Number of retries on failure
  retryDelay?: number; // Base delay in ms for exponential backoff
  onProgress?: (progress: number, completed: number, total: number) => void;
  onBatchComplete?: (results: OCRResult[]) => void;
  signal?: AbortSignal; // For cancellation
}

export interface ProcessorConfig {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  batchSizeOptimal: number; // Optimal batch size based on complexity
  batchSizeMax: number; // Maximum batch size
}

const DEFAULT_CONFIG: ProcessorConfig = {
  maxConcurrency: 3,
  retryAttempts: 3,
  retryDelay: 1000,
  batchSizeOptimal: 5,
  batchSizeMax: 10,
};

/**
 * Batch OCR processor with intelligent batching and parallel execution
 */
export class BatchOCRProcessor {
  private config: ProcessorConfig;
  private activeRequests = 0;
  private queue: OCRImage[] = [];
  private results: OCRResult[] = [];
  private aborted = false;

  constructor(config: Partial<ProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process multiple images with intelligent batching
   */
  async processImages(
    images: OCRImage[],
    options: BatchOCROptions = {}
  ): Promise<OCRResult[]> {
    this.reset();
    this.queue = [...images];
    const total = images.length;
    let completed = 0;

    // Listen for abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        this.aborted = true;
      });
    }

    // Create batches based on complexity
    const batches = this.createOptimalBatches(images);

    // Process batches
    for (const batch of batches) {
      if (this.aborted) break;

      const batchResults = await this.processBatch(
        batch,
        options.retryAttempts ?? this.config.retryAttempts,
        options.retryDelay ?? this.config.retryDelay
      );

      this.results.push(...batchResults);
      completed += batch.length;

      // Report progress
      const progress = Math.round((completed / total) * 100);
      options.onProgress?.(progress, completed, total);
      options.onBatchComplete?.(batchResults);
    }

    return this.results;
  }

  /**
   * Create optimal batches based on image complexity
   */
  private createOptimalBatches(images: OCRImage[]): OCRImage[][] {
    const batches: OCRImage[][] = [];
    let currentBatch: OCRImage[] = [];
    let currentComplexity = 0;

    for (const image of images) {
      const complexity = image.complexity ?? 0.5;
      const batchComplexity = currentComplexity + complexity;

      // Start new batch if:
      // 1. Current batch is at max size, OR
      // 2. Adding this image would exceed optimal complexity threshold
      const shouldStartNewBatch =
        currentBatch.length >= this.config.batchSizeMax ||
        (currentBatch.length >= this.config.batchSizeOptimal &&
          batchComplexity > this.config.batchSizeOptimal * 0.7);

      if (shouldStartNewBatch && currentBatch.length > 0) {
        batches.push(currentBatch);
        currentBatch = [];
        currentComplexity = 0;
      }

      currentBatch.push(image);
      currentComplexity += complexity;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Process a single batch with parallel execution
   */
  private async processBatch(
    batch: OCRImage[],
    retryAttempts: number,
    retryDelay: number
  ): Promise<OCRResult[]> {
    const concurrency = Math.min(this.config.maxConcurrency, batch.length);
    const results: OCRResult[] = [];
    const queue = [...batch];

    // Worker pool
    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        if (this.aborted) break;

        const image = queue.shift();
        if (!image) break;

        const result = await this.processImageWithRetry(
          image,
          retryAttempts,
          retryDelay
        );
        results.push(result);
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * Process a single image with retry logic
   */
  private async processImageWithRetry(
    image: OCRImage,
    attemptsLeft: number,
    delay: number
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      const result = await this.processImage(image);
      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      if (attemptsLeft <= 1) {
        // No more retries
        return {
          id: image.id,
          pageNumber: image.pageNumber,
          text: "",
          confidence: 0,
          processingTime: Date.now() - startTime,
          error:
            error instanceof Error ? error.message : "Unknown OCR error",
        };
      }

      // Exponential backoff
      await this.sleep(delay);
      return this.processImageWithRetry(
        image,
        attemptsLeft - 1,
        delay * 2
      );
    }
  }

  /**
   * Process a single image (placeholder - replace with actual OCR call)
   */
  private async processImage(image: OCRImage): Promise<OCRResult> {
    // TODO: Replace with actual OCR API call (Groq Vision, Tesseract, etc.)
    // This is a placeholder implementation
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData: image.data }),
    });

    if (!response.ok) {
      throw new Error(`OCR failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: image.id,
      pageNumber: image.pageNumber,
      text: data.text || "",
      confidence: data.confidence || 0,
      processingTime: 0, // Will be set by caller
    };
  }

  /**
   * Estimate image complexity based on file size and dimensions
   */
  static estimateComplexity(
    fileSize: number,
    width: number,
    height: number
  ): number {
    // Normalize file size (assume typical range 100KB - 5MB)
    const sizeScore = Math.min(fileSize / (5 * 1024 * 1024), 1);

    // Normalize pixel count (assume typical range 500x500 - 3000x3000)
    const pixels = width * height;
    const pixelScore = Math.min(pixels / (3000 * 3000), 1);

    // Weighted average (size more important than dimensions)
    return sizeScore * 0.7 + pixelScore * 0.3;
  }

  /**
   * Cancel ongoing processing
   */
  cancel(): void {
    this.aborted = true;
  }

  /**
   * Get current progress
   */
  getProgress(): {
    total: number;
    completed: number;
    pending: number;
    progress: number;
  } {
    const total = this.queue.length + this.results.length;
    const completed = this.results.length;
    const pending = this.queue.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, progress };
  }

  /**
   * Reset processor state
   */
  private reset(): void {
    this.queue = [];
    this.results = [];
    this.aborted = false;
    this.activeRequests = 0;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to split large PDFs into manageable chunks
 */
export function chunkImages(
  images: OCRImage[],
  chunkSize: number
): OCRImage[][] {
  const chunks: OCRImage[][] = [];
  for (let i = 0; i < images.length; i += chunkSize) {
    chunks.push(images.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Calculate optimal concurrency based on system resources
 */
export function calculateOptimalConcurrency(): number {
  // Check if running in browser
  if (typeof navigator !== "undefined" && "hardwareConcurrency" in navigator) {
    // Use half of available cores (conservative approach)
    return Math.max(2, Math.floor(navigator.hardwareConcurrency / 2));
  }

  // Default fallback
  return 3;
}
