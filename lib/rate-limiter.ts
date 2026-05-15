/**
 * Rate limiting utilities for API calls
 *
 * Implements token bucket and sliding window rate limiting
 * to prevent API quota exhaustion and ensure fair usage.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  strategy?: 'token-bucket' | 'sliding-window';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private requestTimestamps: number[] = [];

  constructor(private config: RateLimitConfig) {
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  /**
   * Check if a request can proceed
   */
  async checkLimit(key: string = 'default'): Promise<RateLimitResult> {
    const now = Date.now();
    const strategy = this.config.strategy || 'token-bucket';

    if (strategy === 'token-bucket') {
      return this.tokenBucketCheck(now);
    } else {
      return this.slidingWindowCheck(now);
    }
  }

  /**
   * Token bucket algorithm
   */
  private tokenBucketCheck(now: number): RateLimitResult {
    // Refill tokens based on elapsed time
    const elapsed = now - this.lastRefill;
    const refillRate = this.config.maxRequests / this.config.windowMs;
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(
        this.config.maxRequests,
        this.tokens + tokensToAdd
      );
      this.lastRefill = now;
    }

    // Check if request can proceed
    if (this.tokens > 0) {
      this.tokens--;

      return {
        allowed: true,
        remaining: this.tokens,
        resetAt: now + this.config.windowMs,
      };
    }

    // Calculate retry-after
    const timeUntilRefill = this.config.windowMs / this.config.maxRequests;

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + timeUntilRefill,
      retryAfter: timeUntilRefill,
    };
  }

  /**
   * Sliding window algorithm
   */
  private slidingWindowCheck(now: number): RateLimitResult {
    // Remove timestamps outside the window
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    if (this.requestTimestamps.length < this.config.maxRequests) {
      this.requestTimestamps.push(now);

      return {
        allowed: true,
        remaining: this.config.maxRequests - this.requestTimestamps.length,
        resetAt: this.requestTimestamps[0] + this.config.windowMs,
      };
    }

    // Calculate when the oldest request will expire
    const oldestTimestamp = this.requestTimestamps[0];
    const retryAfter = this.config.windowMs - (now - oldestTimestamp);

    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestTimestamp + this.config.windowMs,
      retryAfter,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.config.maxRequests;
    this.lastRefill = Date.now();
    this.requestTimestamps = [];
  }

  /**
   * Get current status
   */
  getStatus(): {
    remaining: number;
    limit: number;
    strategy: string;
  } {
    return {
      remaining: this.tokens,
      limit: this.config.maxRequests,
      strategy: this.config.strategy || 'token-bucket',
    };
  }
}

/**
 * Multi-key rate limiter manager
 */
class RateLimiterManager {
  private limiters: Map<string, RateLimiter> = new Map();
  private defaultConfig: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    strategy: 'token-bucket',
  };

  /**
   * Set default configuration
   */
  setDefaultConfig(config: Partial<RateLimitConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get or create a rate limiter for a key
   */
  private getLimiter(
    key: string,
    config?: RateLimitConfig
  ): RateLimiter {
    if (!this.limiters.has(key)) {
      const limiterConfig = config || this.defaultConfig;
      this.limiters.set(key, new RateLimiter(limiterConfig));
    }

    return this.limiters.get(key)!;
  }

  /**
   * Check rate limit for a specific key
   */
  async check(
    key: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const limiter = this.getLimiter(key, config);
    return limiter.checkLimit(key);
  }

  /**
   * Execute a function with rate limiting
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    config?: RateLimitConfig
  ): Promise<T> {
    const result = await this.check(key, config);

    if (!result.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded for ${key}. Retry after ${result.retryAfter}ms`,
        result
      );
    }

    return fn();
  }

  /**
   * Execute with automatic retry on rate limit
   */
  async executeWithRetry<T>(
    key: string,
    fn: () => Promise<T>,
    config?: RateLimitConfig,
    maxRetries: number = 3
  ): Promise<T> {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        return await this.execute(key, fn, config);
      } catch (error) {
        if (error instanceof RateLimitError && attempt < maxRetries - 1) {
          const retryAfter = error.result.retryAfter || 1000;
          await this.sleep(retryAfter);
          attempt++;
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Max retries (${maxRetries}) exceeded for ${key}`);
  }

  /**
   * Reset a specific limiter
   */
  reset(key: string): void {
    const limiter = this.limiters.get(key);
    if (limiter) {
      limiter.reset();
    }
  }

  /**
   * Reset all limiters
   */
  resetAll(): void {
    this.limiters.forEach((limiter) => limiter.reset());
  }

  /**
   * Remove a limiter
   */
  remove(key: string): void {
    this.limiters.delete(key);
  }

  /**
   * Get status for all limiters
   */
  getAllStatus(): Record<string, ReturnType<RateLimiter['getStatus']>> {
    const status: Record<string, ReturnType<RateLimiter['getStatus']>> = {};

    this.limiters.forEach((limiter, key) => {
      status[key] = limiter.getStatus();
    });

    return status;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public result: RateLimitResult
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Singleton rate limiter manager
 */
export const rateLimiter = new RateLimiterManager();

/**
 * Hook for React components
 */
export function useRateLimiter(
  key: string,
  config?: RateLimitConfig
) {
  return {
    check: () => rateLimiter.check(key, config),
    execute: <T,>(fn: () => Promise<T>) =>
      rateLimiter.execute(key, fn, config),
    executeWithRetry: <T,>(fn: () => Promise<T>, maxRetries?: number) =>
      rateLimiter.executeWithRetry(key, fn, config, maxRetries),
    reset: () => rateLimiter.reset(key),
    getStatus: () => {
      const allStatus = rateLimiter.getAllStatus();
      return allStatus[key] || { remaining: 0, limit: 0, strategy: 'unknown' };
    },
  };
}

/**
 * Decorator for automatic rate limiting
 */
export function rateLimit(key: string, config?: RateLimitConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return rateLimiter.execute(
        key,
        () => originalMethod.apply(this, args),
        config
      );
    };

    return descriptor;
  };
}

/**
 * Common rate limit configurations
 */
export const RateLimitPresets = {
  // Very strict: 5 requests per minute
  STRICT: { maxRequests: 5, windowMs: 60000 },

  // Standard: 10 requests per minute
  STANDARD: { maxRequests: 10, windowMs: 60000 },

  // Generous: 30 requests per minute
  GENEROUS: { maxRequests: 30, windowMs: 60000 },

  // Burst: 100 requests per minute
  BURST: { maxRequests: 100, windowMs: 60000 },

  // API specific presets
  GROQ: { maxRequests: 30, windowMs: 60000 }, // Groq API limits
  OPENAI: { maxRequests: 60, windowMs: 60000 }, // OpenAI API limits
} as const;
