/**
 * @fileoverview Export History - Track and manage document export history
 * @module lib/export-history
 *
 * Provides functionality to:
 * - Track export history with timestamps
 * - Store export metadata in local storage
 * - Retrieve recent exports for quick re-download
 * - Calculate export statistics
 *
 * @example
 * ```typescript
 * import { ExportHistory } from './export-history';
 *
 * const history = new ExportHistory();
 * history.recordExport({
 *   documentId: 'doc-123',
 *   format: 'latex',
 *   filename: 'thesis.tex',
 * });
 *
 * const recent = history.getRecentExports(5);
 * ```
 */

/**
 * Supported export formats
 */
export type ExportFormat = 'latex' | 'markdown' | 'overleaf' | 'pdf' | 'docx' | 'html';

/**
 * Export record metadata
 */
export interface ExportRecord {
  /** Unique export identifier */
  id: string;
  /** Document identifier */
  documentId: string;
  /** Document title at time of export */
  documentTitle: string;
  /** Export format used */
  format: ExportFormat;
  /** Generated filename */
  filename: string;
  /** File size in bytes */
  fileSize: number;
  /** Export timestamp (ISO string) */
  timestamp: string;
  /** Whether export completed successfully */
  success: boolean;
  /** Error message if export failed */
  errorMessage?: string;
  /** Export duration in milliseconds */
  durationMs?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Export statistics summary
 */
export interface ExportStats {
  /** Total number of exports */
  totalExports: number;
  /** Number of successful exports */
  successfulExports: number;
  /** Number of failed exports */
  failedExports: number;
  /** Success rate as percentage */
  successRate: number;
  /** Exports by format */
  byFormat: Record<ExportFormat, number>;
  /** Total bytes exported */
  totalBytesExported: number;
  /** Average export duration in ms */
  avgDurationMs: number;
  /** Most common format */
  mostCommonFormat: ExportFormat | null;
  /** First export date */
  firstExportDate: string | null;
  /** Most recent export date */
  lastExportDate: string | null;
}

/**
 * Options for retrieving export history
 */
export interface HistoryQueryOptions {
  /** Filter by format */
  format?: ExportFormat;
  /** Filter by document ID */
  documentId?: string;
  /** Only successful exports */
  successOnly?: boolean;
  /** Start date filter */
  startDate?: Date;
  /** End date filter */
  endDate?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

const STORAGE_KEY = 'type-it-up-export-history';
const MAX_HISTORY_SIZE = 1000;

/**
 * Manages export history tracking and retrieval
 *
 * This class provides a complete solution for tracking document exports,
 * storing history in local storage, and computing usage statistics.
 *
 * @example
 * ```typescript
 * const history = new ExportHistory();
 *
 * // Record an export
 * const record = history.recordExport({
 *   documentId: 'doc-123',
 *   documentTitle: 'My Thesis',
 *   format: 'pdf',
 *   filename: 'thesis.pdf',
 *   fileSize: 1024000,
 * });
 *
 * // Get statistics
 * const stats = history.getStats();
 * console.log(`Total exports: ${stats.totalExports}`);
 * ```
 */
export class ExportHistory {
  private records: ExportRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load history from local storage
   *
   * @private
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.records = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load export history:', error);
      this.records = [];
    }
  }

  /**
   * Save history to local storage
   *
   * @private
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      // Trim to max size
      if (this.records.length > MAX_HISTORY_SIZE) {
        this.records = this.records.slice(-MAX_HISTORY_SIZE);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.warn('Failed to save export history:', error);
    }
  }

  /**
   * Generate a unique ID for an export record
   *
   * @private
   * @returns {string} Unique identifier
   */
  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Record a new export in history
   *
   * @param {Partial<ExportRecord>} data - Export data to record
   * @returns {ExportRecord} The created export record
   *
   * @example
   * ```typescript
   * const record = history.recordExport({
   *   documentId: 'doc-456',
   *   documentTitle: 'Report Q4',
   *   format: 'overleaf',
   *   filename: 'report.zip',
   *   fileSize: 2048000,
   *   durationMs: 1500,
   * });
   * ```
   */
  recordExport(data: Partial<ExportRecord> & {
    documentId: string;
    format: ExportFormat;
    filename: string;
  }): ExportRecord {
    const record: ExportRecord = {
      id: this.generateId(),
      documentId: data.documentId,
      documentTitle: data.documentTitle || 'Untitled',
      format: data.format,
      filename: data.filename,
      fileSize: data.fileSize || 0,
      timestamp: new Date().toISOString(),
      success: data.success !== false,
      errorMessage: data.errorMessage,
      durationMs: data.durationMs,
      metadata: data.metadata,
    };

    this.records.push(record);
    this.saveToStorage();

    return record;
  }

  /**
   * Record a failed export
   *
   * @param {string} documentId - Document identifier
   * @param {ExportFormat} format - Attempted format
   * @param {string} errorMessage - Error description
   * @returns {ExportRecord} The created error record
   */
  recordError(
    documentId: string,
    format: ExportFormat,
    errorMessage: string
  ): ExportRecord {
    return this.recordExport({
      documentId,
      format,
      filename: 'failed',
      success: false,
      errorMessage,
    });
  }

  /**
   * Get export history with optional filtering
   *
   * @param {HistoryQueryOptions} [options={}] - Query options
   * @returns {ExportRecord[]} Matching export records
   *
   * @example
   * ```typescript
   * // Get last 10 PDF exports
   * const pdfExports = history.getHistory({
   *   format: 'pdf',
   *   limit: 10,
   *   sortOrder: 'desc',
   * });
   * ```
   */
  getHistory(options: HistoryQueryOptions = {}): ExportRecord[] {
    let results = [...this.records];

    // Apply filters
    if (options.format) {
      results = results.filter((r) => r.format === options.format);
    }

    if (options.documentId) {
      results = results.filter((r) => r.documentId === options.documentId);
    }

    if (options.successOnly) {
      results = results.filter((r) => r.success);
    }

    if (options.startDate) {
      const start = options.startDate.toISOString();
      results = results.filter((r) => r.timestamp >= start);
    }

    if (options.endDate) {
      const end = options.endDate.toISOString();
      results = results.filter((r) => r.timestamp <= end);
    }

    // Sort
    results.sort((a, b) => {
      const comparison = a.timestamp.localeCompare(b.timestamp);
      return options.sortOrder === 'asc' ? comparison : -comparison;
    });

    // Limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get recent exports
   *
   * @param {number} [count=10] - Number of records to return
   * @returns {ExportRecord[]} Most recent export records
   */
  getRecentExports(count: number = 10): ExportRecord[] {
    return this.getHistory({ limit: count, sortOrder: 'desc' });
  }

  /**
   * Get exports for a specific document
   *
   * @param {string} documentId - Document identifier
   * @returns {ExportRecord[]} Export records for the document
   */
  getDocumentExports(documentId: string): ExportRecord[] {
    return this.getHistory({ documentId, sortOrder: 'desc' });
  }

  /**
   * Get export by ID
   *
   * @param {string} id - Export record ID
   * @returns {ExportRecord | undefined} The export record if found
   */
  getById(id: string): ExportRecord | undefined {
    return this.records.find((r) => r.id === id);
  }

  /**
   * Calculate export statistics
   *
   * @returns {ExportStats} Aggregated statistics
   *
   * @example
   * ```typescript
   * const stats = history.getStats();
   * console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);
   * console.log(`Most common format: ${stats.mostCommonFormat}`);
   * ```
   */
  getStats(): ExportStats {
    const totalExports = this.records.length;
    const successfulExports = this.records.filter((r) => r.success).length;
    const failedExports = totalExports - successfulExports;

    const byFormat: Record<ExportFormat, number> = {
      latex: 0,
      markdown: 0,
      overleaf: 0,
      pdf: 0,
      docx: 0,
      html: 0,
    };

    let totalBytes = 0;
    let totalDuration = 0;
    let durationCount = 0;

    for (const record of this.records) {
      byFormat[record.format] = (byFormat[record.format] || 0) + 1;
      totalBytes += record.fileSize || 0;

      if (record.durationMs !== undefined) {
        totalDuration += record.durationMs;
        durationCount++;
      }
    }

    // Find most common format
    let mostCommonFormat: ExportFormat | null = null;
    let maxCount = 0;
    for (const [format, count] of Object.entries(byFormat)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonFormat = format as ExportFormat;
      }
    }

    // Get date range
    const sorted = [...this.records].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );

    return {
      totalExports,
      successfulExports,
      failedExports,
      successRate: totalExports > 0 ? (successfulExports / totalExports) * 100 : 0,
      byFormat,
      totalBytesExported: totalBytes,
      avgDurationMs: durationCount > 0 ? totalDuration / durationCount : 0,
      mostCommonFormat,
      firstExportDate: sorted[0]?.timestamp || null,
      lastExportDate: sorted[sorted.length - 1]?.timestamp || null,
    };
  }

  /**
   * Delete an export record
   *
   * @param {string} id - Export record ID
   * @returns {boolean} True if record was deleted
   */
  deleteRecord(id: string): boolean {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) {
      return false;
    }

    this.records.splice(index, 1);
    this.saveToStorage();
    return true;
  }

  /**
   * Clear all export history
   */
  clearHistory(): void {
    this.records = [];
    this.saveToStorage();
  }

  /**
   * Clear old records beyond retention period
   *
   * @param {number} [daysToKeep=90] - Number of days of history to retain
   * @returns {number} Number of records deleted
   */
  pruneOldRecords(daysToKeep: number = 90): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const cutoffStr = cutoff.toISOString();

    const originalCount = this.records.length;
    this.records = this.records.filter((r) => r.timestamp >= cutoffStr);

    const deleted = originalCount - this.records.length;
    if (deleted > 0) {
      this.saveToStorage();
    }

    return deleted;
  }

  /**
   * Export history to JSON for backup
   *
   * @returns {string} JSON string of all records
   */
  exportToJson(): string {
    return JSON.stringify(this.records, null, 2);
  }

  /**
   * Import history from JSON backup
   *
   * @param {string} json - JSON string of records
   * @param {boolean} [merge=true] - Merge with existing or replace
   */
  importFromJson(json: string, merge: boolean = true): void {
    try {
      const imported: ExportRecord[] = JSON.parse(json);

      if (merge) {
        // Add only records with new IDs
        const existingIds = new Set(this.records.map((r) => r.id));
        const newRecords = imported.filter((r) => !existingIds.has(r.id));
        this.records.push(...newRecords);
      } else {
        this.records = imported;
      }

      this.saveToStorage();
    } catch (error) {
      throw new Error(`Failed to import history: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }
}

/**
 * Singleton instance for app-wide usage
 */
let exportHistoryInstance: ExportHistory | null = null;

/**
 * Get the shared export history instance
 *
 * @returns {ExportHistory} Shared history instance
 */
export function getExportHistory(): ExportHistory {
  if (!exportHistoryInstance) {
    exportHistoryInstance = new ExportHistory();
  }
  return exportHistoryInstance;
}
