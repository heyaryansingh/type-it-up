/**
 * Performance monitoring utilities for Type-It-Up
 *
 * Tracks processing times, memory usage, and identifies bottlenecks
 * in the OCR and document conversion pipeline.
 */

export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsed?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  totalOperations: number;
  totalDuration: number;
  averageDuration: number;
  slowestOperation: PerformanceMetrics | null;
  fastestOperation: PerformanceMetrics | null;
  memoryPeakUsage: number;
  operationBreakdown: Record<string, {
    count: number;
    totalDuration: number;
    avgDuration: number;
  }>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private completedMetrics: PerformanceMetrics[] = [];
  private enabled: boolean = true;

  /**
   * Enable or disable performance tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start tracking a new operation
   */
  start(operationName: string, metadata?: Record<string, any>): string {
    if (!this.enabled) return '';

    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;

    const metric: PerformanceMetrics = {
      operationName,
      startTime: performance.now(),
      metadata,
    };

    this.metrics.set(operationId, metric);
    return operationId;
  }

  /**
   * End tracking for an operation
   */
  end(operationId: string): void {
    if (!this.enabled || !operationId) return;

    const metric = this.metrics.get(operationId);
    if (!metric) {
      console.warn(`Performance metric not found for operation: ${operationId}`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    // Add memory usage if available
    let memoryUsed: number | undefined;
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const perfMemory = performance as any;
      memoryUsed = perfMemory.memory?.usedJSHeapSize;
    }

    const completedMetric: PerformanceMetrics = {
      ...metric,
      endTime,
      duration,
      memoryUsed,
    };

    this.completedMetrics.push(completedMetric);
    this.metrics.delete(operationId);
  }

  /**
   * Measure an async operation
   */
  async measure<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.start(operationName, metadata);

    try {
      const result = await operation();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   */
  measureSync<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>
  ): T {
    const id = this.start(operationName, metadata);

    try {
      const result = operation();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }

  /**
   * Get a performance report
   */
  getReport(): PerformanceReport {
    if (this.completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        totalDuration: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
        memoryPeakUsage: 0,
        operationBreakdown: {},
      };
    }

    const totalDuration = this.completedMetrics.reduce(
      (sum, m) => sum + (m.duration || 0),
      0
    );

    const avgDuration = totalDuration / this.completedMetrics.length;

    // Find slowest and fastest
    let slowest = this.completedMetrics[0];
    let fastest = this.completedMetrics[0];

    for (const metric of this.completedMetrics) {
      if ((metric.duration || 0) > (slowest.duration || 0)) {
        slowest = metric;
      }
      if ((metric.duration || 0) < (fastest.duration || 0)) {
        fastest = metric;
      }
    }

    // Memory peak
    const memoryPeak = Math.max(
      ...this.completedMetrics.map((m) => m.memoryUsed || 0)
    );

    // Operation breakdown
    const breakdown: Record<string, { count: number; totalDuration: number; avgDuration: number }> = {};

    for (const metric of this.completedMetrics) {
      if (!breakdown[metric.operationName]) {
        breakdown[metric.operationName] = {
          count: 0,
          totalDuration: 0,
          avgDuration: 0,
        };
      }

      breakdown[metric.operationName].count++;
      breakdown[metric.operationName].totalDuration += metric.duration || 0;
    }

    // Calculate averages
    for (const key in breakdown) {
      breakdown[key].avgDuration =
        breakdown[key].totalDuration / breakdown[key].count;
    }

    return {
      totalOperations: this.completedMetrics.length,
      totalDuration,
      averageDuration: avgDuration,
      slowestOperation: slowest,
      fastestOperation: fastest,
      memoryPeakUsage: memoryPeak,
      operationBreakdown: breakdown,
    };
  }

  /**
   * Get metrics for a specific operation type
   */
  getMetricsFor(operationName: string): PerformanceMetrics[] {
    return this.completedMetrics.filter(
      (m) => m.operationName === operationName
    );
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.completedMetrics = [];
  }

  /**
   * Export metrics to JSON
   */
  export(): string {
    return JSON.stringify({
      report: this.getReport(),
      allMetrics: this.completedMetrics,
    }, null, 2);
  }

  /**
   * Get bottlenecks (operations taking > threshold ms)
   */
  getBottlenecks(thresholdMs: number = 1000): PerformanceMetrics[] {
    return this.completedMetrics
      .filter((m) => (m.duration || 0) > thresholdMs)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const report = this.getReport();

    console.group('📊 Performance Summary');
    console.log(`Total Operations: ${report.totalOperations}`);
    console.log(`Total Duration: ${report.totalDuration.toFixed(2)}ms`);
    console.log(`Average Duration: ${report.averageDuration.toFixed(2)}ms`);

    if (report.slowestOperation) {
      console.log(
        `Slowest: ${report.slowestOperation.operationName} (${report.slowestOperation.duration?.toFixed(2)}ms)`
      );
    }

    if (report.fastestOperation) {
      console.log(
        `Fastest: ${report.fastestOperation.operationName} (${report.fastestOperation.duration?.toFixed(2)}ms)`
      );
    }

    if (report.memoryPeakUsage > 0) {
      console.log(
        `Peak Memory: ${(report.memoryPeakUsage / 1024 / 1024).toFixed(2)} MB`
      );
    }

    console.group('Operation Breakdown');
    for (const [name, stats] of Object.entries(report.operationBreakdown)) {
      console.log(
        `${name}: ${stats.count}x, avg ${stats.avgDuration.toFixed(2)}ms`
      );
    }
    console.groupEnd();

    const bottlenecks = this.getBottlenecks(1000);
    if (bottlenecks.length > 0) {
      console.group('⚠️ Bottlenecks (>1000ms)');
      bottlenecks.forEach((b) => {
        console.log(`${b.operationName}: ${b.duration?.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    console.groupEnd();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Helper hooks for React components
export function usePerformanceMonitor() {
  return {
    start: (name: string, metadata?: Record<string, any>) =>
      performanceMonitor.start(name, metadata),
    end: (id: string) => performanceMonitor.end(id),
    measure: <T,>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>) =>
      performanceMonitor.measure(name, operation, metadata),
    measureSync: <T,>(name: string, operation: () => T, metadata?: Record<string, any>) =>
      performanceMonitor.measureSync(name, operation, metadata),
    getReport: () => performanceMonitor.getReport(),
    getBottlenecks: (threshold?: number) => performanceMonitor.getBottlenecks(threshold),
    clear: () => performanceMonitor.clear(),
    logSummary: () => performanceMonitor.logSummary(),
  };
}

// Decorator for automatic performance tracking
export function tracked(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(name, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
