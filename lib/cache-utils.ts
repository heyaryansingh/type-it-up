/**
 * @fileoverview Caching utilities for expensive operations
 * @module lib/cache-utils
 *
 * Provides in-memory and localStorage caching for document analysis results
 * to avoid redundant API calls and computations.
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DocumentCache<T> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map();
  private readonly namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Generate cache key from document or content
   */
  private generateKey(input: string | object): string {
    if (typeof input === 'string') {
      return `${this.namespace}:${this.hashString(input)}`;
    }
    return `${this.namespace}:${this.hashString(JSON.stringify(input))}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached value if exists and not expired
   */
  get(key: string | object): T | null {
    const cacheKey = this.generateKey(key);

    // Check memory cache first
    const memEntry = this.memoryCache.get(cacheKey);
    if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
      return memEntry.data;
    }

    // Check localStorage (if available)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (Date.now() - entry.timestamp < entry.ttl) {
            // Restore to memory cache
            this.memoryCache.set(cacheKey, entry);
            return entry.data;
          } else {
            // Expired - remove it
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.warn('Cache retrieval failed:', error);
      }
    }

    return null;
  }

  /**
   * Set cache value with TTL
   */
  set(key: string | object, data: T, ttlMs: number = 3600000): void {
    const cacheKey = this.generateKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // Store in memory
    this.memoryCache.set(cacheKey, entry);

    // Store in localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch (error) {
        // Quota exceeded or other error - ignore
        console.warn('Cache storage failed:', error);
      }
    }
  }

  /**
   * Clear expired entries from both caches
   */
  cleanup(): void {
    const now = Date.now();

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // Clean localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.namespace)) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry: CacheEntry<T> = JSON.parse(stored);
              if (now - entry.timestamp >= entry.ttl) {
                localStorage.removeItem(key);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Cache cleanup failed:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith(this.namespace)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn('Cache clear failed:', error);
      }
    }
  }
}

// Export singleton instances
export const analysisCache = new DocumentCache<any>('type-it-up:analysis');
export const ocrCache = new DocumentCache<any>('type-it-up:ocr');

// Run cleanup on page load
if (typeof window !== 'undefined') {
  // Cleanup every 5 minutes
  setInterval(() => {
    analysisCache.cleanup();
    ocrCache.cleanup();
  }, 300000);
}
