/**
 * @fileoverview Batch Processing Utilities for Document OCR
 * @module lib/batch-processor
 *
 * Provides functions for processing multiple documents in batch,
 * with progress tracking, error handling, and result aggregation.
 *
 * @example
 * ```typescript
 * import { createBatchJob, processBatch, getBatchStatus } from './batch-processor';
 *
 * const job = createBatchJob(files);
 * const results = await processBatch(job, processDocument);
 * console.log(`Processed ${results.successful}/${results.total} documents`);
 * ```
 */

export type BatchStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface BatchItem<T = unknown> {
  /** Unique identifier for the item */
  id: string;
  /** Original input data */
  input: T;
  /** Processing status */
  status: BatchStatus;
  /** Result if successful */
  result?: unknown;
  /** Error message if failed */
  error?: string;
  /** Processing start time */
  startedAt?: Date;
  /** Processing end time */
  completedAt?: Date;
  /** Retry count */
  retryCount: number;
}

export interface BatchJob<T = unknown> {
  /** Unique job identifier */
  jobId: string;
  /** All items in the batch */
  items: BatchItem<T>[];
  /** Overall job status */
  status: BatchStatus;
  /** Job creation time */
  createdAt: Date;
  /** Job start time */
  startedAt?: Date;
  /** Job completion time */
  completedAt?: Date;
  /** Concurrency limit */
  concurrency: number;
  /** Max retries per item */
  maxRetries: number;
  /** Progress percentage (0-100) */
  progress: number;
}

export interface BatchResult<T = unknown, R = unknown> {
  /** Job identifier */
  jobId: string;
  /** Total items processed */
  total: number;
  /** Successfully processed count */
  successful: number;
  /** Failed count */
  failed: number;
  /** Skipped count */
  skipped: number;
  /** Individual item results */
  items: Array<{
    id: string;
    input: T;
    status: BatchStatus;
    result?: R;
    error?: string;
    durationMs: number;
  }>;
  /** Total processing time in ms */
  totalDurationMs: number;
  /** Average processing time per item */
  avgDurationMs: number;
}

export interface BatchOptions {
  /** Maximum concurrent operations (default: 3) */
  concurrency?: number;
  /** Maximum retries per item (default: 2) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelayMs?: number;
  /** Progress callback */
  onProgress?: (progress: BatchProgress) => void;
  /** Item complete callback */
  onItemComplete?: (item: BatchItem) => void;
  /** Should cancel callback */
  shouldCancel?: () => boolean;
}

export interface BatchProgress {
  /** Job identifier */
  jobId: string;
  /** Completed items */
  completed: number;
  /** Total items */
  total: number;
  /** Progress percentage */
  percent: number;
  /** Currently processing items */
  inProgress: number;
  /** Estimated time remaining in ms */
  estimatedRemainingMs?: number;
}

let jobCounter = 0;

/**
 * Generate a unique job ID
 */
function generateJobId(): string {
  jobCounter++;
  return `batch-${Date.now()}-${jobCounter}`;
}

/**
 * Generate a unique item ID
 */
function generateItemId(index: number): string {
  return `item-${Date.now()}-${index}`;
}

/**
 * Create a new batch job from input items
 *
 * @param inputs - Array of items to process
 * @param options - Batch processing options
 * @returns BatchJob ready for processing
 *
 * @example
 * ```typescript
 * const files = [file1, file2, file3];
 * const job = createBatchJob(files, { concurrency: 2 });
 * ```
 */
export function createBatchJob<T>(
  inputs: T[],
  options: BatchOptions = {}
): BatchJob<T> {
  const { concurrency = 3, maxRetries = 2 } = options;

  const items: BatchItem<T>[] = inputs.map((input, index) => ({
    id: generateItemId(index),
    input,
    status: "pending" as const,
    retryCount: 0,
  }));

  return {
    jobId: generateJobId(),
    items,
    status: "pending",
    createdAt: new Date(),
    concurrency,
    maxRetries,
    progress: 0,
  };
}

/**
 * Process a batch job with the given processor function
 *
 * @param job - The batch job to process
 * @param processor - Async function to process each item
 * @param options - Processing options
 * @returns BatchResult with all processing results
 *
 * @example
 * ```typescript
 * const result = await processBatch(job, async (file) => {
 *   const doc = await processDocument(file);
 *   return doc;
 * });
 * ```
 */
export async function processBatch<T, R>(
  job: BatchJob<T>,
  processor: (input: T, itemId: string) => Promise<R>,
  options: BatchOptions = {}
): Promise<BatchResult<T, R>> {
  const {
    concurrency = job.concurrency,
    maxRetries = job.maxRetries,
    retryDelayMs = 1000,
    onProgress,
    onItemComplete,
    shouldCancel,
  } = options;

  const startTime = Date.now();
  job.status = "processing";
  job.startedAt = new Date();

  const itemDurations: Map<string, number> = new Map();

  // Process items with concurrency limit
  const pending = [...job.items];
  const inProgress: Set<string> = new Set();
  let completedCount = 0;

  const processItem = async (item: BatchItem<T>): Promise<void> => {
    if (shouldCancel?.()) {
      item.status = "cancelled";
      return;
    }

    item.status = "processing";
    item.startedAt = new Date();
    inProgress.add(item.id);

    const itemStart = Date.now();

    try {
      const result = await processor(item.input, item.id);
      item.result = result;
      item.status = "completed";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (item.retryCount < maxRetries) {
        item.retryCount++;
        item.status = "pending";
        await delay(retryDelayMs * item.retryCount);
        pending.push(item);
      } else {
        item.status = "failed";
        item.error = errorMessage;
      }
    } finally {
      item.completedAt = new Date();
      inProgress.delete(item.id);
      itemDurations.set(item.id, Date.now() - itemStart);

      if (item.status !== "pending") {
        completedCount++;
        job.progress = Math.round((completedCount / job.items.length) * 100);

        onItemComplete?.(item);

        if (onProgress) {
          const avgDuration = calculateAvgDuration(itemDurations);
          const remaining = job.items.length - completedCount;
          onProgress({
            jobId: job.jobId,
            completed: completedCount,
            total: job.items.length,
            percent: job.progress,
            inProgress: inProgress.size,
            estimatedRemainingMs: remaining * avgDuration,
          });
        }
      }
    }
  };

  // Process with concurrency
  while (pending.length > 0 || inProgress.size > 0) {
    if (shouldCancel?.()) {
      job.status = "cancelled";
      break;
    }

    while (inProgress.size < concurrency && pending.length > 0) {
      const item = pending.shift();
      if (item) {
        processItem(item);
      }
    }

    if (inProgress.size > 0) {
      await delay(10); // Small delay to prevent busy-waiting
    }
  }

  job.completedAt = new Date();
  job.status = job.items.every((i) => i.status === "completed")
    ? "completed"
    : job.items.some((i) => i.status === "cancelled")
    ? "cancelled"
    : "failed";

  const totalDuration = Date.now() - startTime;

  return buildResult(job, itemDurations, totalDuration);
}

/**
 * Get current status of a batch job
 *
 * @param job - The batch job to check
 * @returns Current job status with counts
 */
export function getBatchStatus<T>(job: BatchJob<T>): {
  status: BatchStatus;
  progress: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
} {
  const counts = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const item of job.items) {
    counts[item.status]++;
  }

  return {
    status: job.status,
    progress: job.progress,
    pending: counts.pending,
    processing: counts.processing,
    completed: counts.completed,
    failed: counts.failed + counts.cancelled,
  };
}

/**
 * Get failed items from a batch job for retry
 *
 * @param job - The batch job
 * @returns Array of failed items
 */
export function getFailedItems<T>(job: BatchJob<T>): BatchItem<T>[] {
  return job.items.filter((item) => item.status === "failed");
}

/**
 * Reset failed items for retry
 *
 * @param job - The batch job to reset
 * @returns Modified job with failed items reset to pending
 */
export function resetFailedItems<T>(job: BatchJob<T>): BatchJob<T> {
  for (const item of job.items) {
    if (item.status === "failed") {
      item.status = "pending";
      item.error = undefined;
      item.retryCount = 0;
    }
  }

  job.status = "pending";
  job.progress = Math.round(
    (job.items.filter((i) => i.status === "completed").length / job.items.length) * 100
  );

  return job;
}

/**
 * Create a summary report for a batch result
 *
 * @param result - The batch result
 * @returns Human-readable summary string
 */
export function formatBatchSummary<T, R>(result: BatchResult<T, R>): string {
  const lines: string[] = [
    `=== Batch Processing Summary ===`,
    `Job ID: ${result.jobId}`,
    ``,
    `Results:`,
    `  Total:      ${result.total}`,
    `  Successful: ${result.successful} (${((result.successful / result.total) * 100).toFixed(1)}%)`,
    `  Failed:     ${result.failed}`,
    `  Skipped:    ${result.skipped}`,
    ``,
    `Timing:`,
    `  Total Duration: ${formatDuration(result.totalDurationMs)}`,
    `  Avg per Item:   ${formatDuration(result.avgDurationMs)}`,
  ];

  if (result.failed > 0) {
    lines.push(``);
    lines.push(`Failed Items:`);
    for (const item of result.items.filter((i) => i.status === "failed")) {
      lines.push(`  - ${item.id}: ${item.error}`);
    }
  }

  return lines.join("\n");
}

// --- Helper Functions ---

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateAvgDuration(durations: Map<string, number>): number {
  if (durations.size === 0) return 0;
  const total = Array.from(durations.values()).reduce((a, b) => a + b, 0);
  return total / durations.size;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function buildResult<T, R>(
  job: BatchJob<T>,
  durations: Map<string, number>,
  totalDuration: number
): BatchResult<T, R> {
  const items = job.items.map((item) => ({
    id: item.id,
    input: item.input,
    status: item.status,
    result: item.result as R | undefined,
    error: item.error,
    durationMs: durations.get(item.id) || 0,
  }));

  const successful = items.filter((i) => i.status === "completed").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const skipped = items.filter((i) => i.status === "cancelled" || i.status === "pending").length;

  return {
    jobId: job.jobId,
    total: items.length,
    successful,
    failed,
    skipped,
    items,
    totalDurationMs: totalDuration,
    avgDurationMs: successful > 0 ? totalDuration / successful : 0,
  };
}
