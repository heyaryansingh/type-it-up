/**
 * Robust retry handling utilities with exponential backoff and circuit breaker patterns.
 *
 * Provides resilient retry mechanisms for API calls, file operations, and async tasks
 * with support for:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Custom retry conditions
 * - Request deduplication
 *
 * @module retry-handler
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Custom function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback invoked on each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting reset */
  resetTimeout: number;
  /** Minimum number of requests before evaluating failure rate */
  minimumRequests: number;
  /** Callback when circuit opens */
  onOpen?: () => void;
  /** Callback when circuit closes */
  onClose?: () => void;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Execute an async operation with automatic retry and exponential backoff.
 *
 * @param operation - Async function to execute
 * @param config - Retry configuration
 * @returns Promise resolving to operation result
 * @throws Last error if all retries exhausted
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   async () => fetch('https://api.example.com/data'),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 1000,
 *     maxDelay: 30000,
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier = 2,
    jitter = true,
    isRetryable = () => true,
    onRetry,
  } = config;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!isRetryable(lastError)) {
        throw lastError;
      }

      // Don't delay on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const delay = jitter ? baseDelay * (0.5 + Math.random() * 0.5) : baseDelay;

      // Invoke retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError || new Error('Operation failed after all retry attempts');
}

/**
 * Circuit breaker implementation for fault tolerance.
 *
 * Prevents cascading failures by temporarily blocking requests when
 * failure rate exceeds threshold.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute operation through circuit breaker.
   *
   * @param operation - Async function to execute
   * @returns Promise resolving to operation result
   * @throws Error if circuit is open
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      const now = Date.now();

      if (this.nextAttemptTime && now < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN - requests blocked');
      }

      // Try to transition to half-open
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await operation();

      // Record success
      this.onSuccess();
      return result;
    } catch (error) {
      // Record failure
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      if (this.config.onClose) {
        this.config.onClose();
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const totalRequests = this.failureCount + this.successCount;

    // Check if we should open the circuit
    if (
      totalRequests >= this.config.minimumRequests &&
      this.failureCount >= this.config.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;

      if (this.config.onOpen) {
        this.config.onOpen();
      }
    }
  }

  /** Get current circuit state */
  getState(): CircuitState {
    return this.state;
  }

  /** Get failure count */
  getFailureCount(): number {
    return this.failureCount;
  }

  /** Manually reset circuit breaker */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

/**
 * Deduplicates concurrent requests for the same key.
 *
 * Useful for preventing multiple simultaneous API calls for identical data.
 */
export class RequestDeduplicator<K = string, V = unknown> {
  private pendingRequests = new Map<K, Promise<V>>();

  /**
   * Execute operation with deduplication.
   *
   * If a request with the same key is already in progress, returns the
   * existing promise instead of executing a new operation.
   *
   * @param key - Unique identifier for this request
   * @param operation - Async function to execute if no pending request exists
   * @returns Promise resolving to operation result
   */
  async execute(key: K, operation: () => Promise<V>): Promise<V> {
    // Check if request already pending
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing;
    }

    // Create new request
    const promise = operation()
      .then((result) => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /** Clear all pending requests */
  clear(): void {
    this.pendingRequests.clear();
  }

  /** Get number of pending requests */
  size(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Rate limiter using token bucket algorithm.
 *
 * Limits the rate of operations to prevent overwhelming external services.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Execute operation with rate limiting.
   *
   * Waits until a token is available before executing the operation.
   *
   * @param operation - Async function to execute
   * @returns Promise resolving to operation result
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    return operation();
  }

  private async acquire(): Promise<void> {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;

    // If no tokens available, wait until refill
    if (this.tokens < 1) {
      const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
      await sleep(waitTime);
      this.tokens = 1;
      this.lastRefill = Date.now();
    }

    this.tokens -= 1;
  }

  /** Get current number of available tokens */
  getTokens(): number {
    return Math.floor(this.tokens);
  }
}

/**
 * Retry with fallback value on failure.
 *
 * @param operation - Async function to execute
 * @param fallback - Value to return if all retries fail
 * @param config - Retry configuration
 * @returns Promise resolving to operation result or fallback
 */
export async function withRetryOrFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  config: RetryConfig
): Promise<T> {
  try {
    return await withRetry(operation, config);
  } catch {
    return fallback;
  }
}

/**
 * Retry multiple operations in parallel with independent retry logic.
 *
 * @param operations - Array of async functions to execute
 * @param config - Retry configuration applied to each operation
 * @returns Promise resolving to array of results
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  config: RetryConfig
): Promise<T[]> {
  return Promise.all(operations.map((op) => withRetry(op, config)));
}

/**
 * Helper function to sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default retry configuration for API calls.
 */
export const DEFAULT_API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: (error: Error) => {
    // Retry on network errors and 5xx server errors
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  },
};

/**
 * Default circuit breaker configuration.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  minimumRequests: 10,
};
