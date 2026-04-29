/**
 * Error recovery and retry utilities for API calls and processing failures.
 *
 * Provides robust error handling with:
 * - Exponential backoff retry
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Error logging and reporting
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors and 5xx status codes
    return error.message.includes('fetch') || error.message.includes('network');
  },
  onRetry: (error: Error, attempt: number) => {
    console.warn(`Retry attempt ${attempt}:`, error.message);
  },
};

/**
 * Execute a function with exponential backoff retry.
 *
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Promise resolving to function result
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => fetch('/api/process'),
 *   { maxAttempts: 5, initialDelay: 2000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelay
      );

      // Call retry callback
      opts.onRetry(lastError, attempt);

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds.
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Circuit breaker to prevent cascading failures.
 *
 * Automatically opens circuit after threshold failures and attempts
 * recovery after timeout period.
 */
export class CircuitBreaker<T> {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000, // 60 seconds
    };
  }

  /**
   * Execute function through circuit breaker.
   *
   * @param fn - Function to execute
   * @returns Promise resolving to function result
   * @throws Error if circuit is open
   *
   * @example
   * ```typescript
   * const breaker = new CircuitBreaker({ failureThreshold: 3 });
   * const result = await breaker.execute(() => apiCall());
   * ```
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
      // Transition to HALF_OPEN to test recovery
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  /**
   * Get current circuit breaker state.
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Reset circuit breaker to closed state.
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
  }
}

/**
 * Graceful degradation wrapper with fallback.
 *
 * @param primary - Primary function to try
 * @param fallback - Fallback function if primary fails
 * @param onFallback - Optional callback when fallback is used
 * @returns Promise resolving to primary or fallback result
 *
 * @example
 * ```typescript
 * const result = await withFallback(
 *   () => groqVisionCall(image),
 *   () => basicOCR(image),
 *   () => console.log('Using fallback OCR')
 * );
 * ```
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  onFallback?: () => void
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (onFallback) {
      onFallback();
    }
    return await fallback();
  }
}

/**
 * Timeout wrapper for promises.
 *
 * @param promise - Promise to wrap
 * @param ms - Timeout in milliseconds
 * @param message - Optional timeout error message
 * @returns Promise that rejects on timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   fetch('/api/slow'),
 *   5000,
 *   'API request timed out'
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/**
 * Batch error handler for array operations.
 *
 * Processes array items and collects both successes and failures.
 *
 * @param items - Array of items to process
 * @param fn - Function to apply to each item
 * @returns Object with successful results and errors
 *
 * @example
 * ```typescript
 * const { successes, errors } = await batchProcess(
 *   files,
 *   async (file) => optimizeImage(file)
 * );
 * ```
 */
export async function batchProcess<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>
): Promise<{
  successes: R[];
  errors: Array<{ index: number; item: T; error: Error }>;
}> {
  const successes: R[] = [];
  const errors: Array<{ index: number; item: T; error: Error }> = [];

  await Promise.all(
    items.map(async (item, index) => {
      try {
        const result = await fn(item, index);
        successes.push(result);
      } catch (error) {
        errors.push({
          index,
          item,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    })
  );

  return { successes, errors };
}

/**
 * Create a debounced version of an async function.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 *
 * @example
 * ```typescript
 * const debouncedSave = debounce(saveDocument, 1000);
 * // Will only execute once after 1000ms of no calls
 * debouncedSave();
 * debouncedSave();
 * debouncedSave();
 * ```
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null;

  return ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}

/**
 * Rate limiter to prevent API quota exhaustion.
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private activeRequests = 0;

  constructor(
    private readonly maxConcurrent: number = 5,
    private readonly minInterval: number = 100
  ) {}

  /**
   * Execute function with rate limiting.
   *
   * @param fn - Function to execute
   * @returns Promise resolving to function result
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter(5, 200); // Max 5 concurrent, 200ms between
   * const result = await limiter.execute(() => apiCall());
   * ```
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if at capacity
    if (this.activeRequests >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.activeRequests++;

    try {
      const result = await fn();
      return result;
    } finally {
      // Wait minimum interval before releasing slot
      await sleep(this.minInterval);

      this.activeRequests--;

      // Process next in queue
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get current queue length.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get number of active requests.
   */
  getActiveCount(): number {
    return this.activeRequests;
  }
}
