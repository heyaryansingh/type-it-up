/**
 * @fileoverview Document Comparison and Diff Utilities
 * @module lib/document-diff
 *
 * Provides functions for comparing documents, detecting changes,
 * calculating similarity scores, and generating diff reports.
 *
 * @example
 * ```typescript
 * import { compareDocuments, highlightChanges } from './document-diff';
 *
 * const diff = compareDocuments(originalDoc, revisedDoc);
 * console.log(`${diff.changeCount} changes detected`);
 * console.log(`Similarity: ${diff.similarity}%`);
 * ```
 */

import type { DocumentJSON, RegionJSON, PageJSON } from "./types";

/**
 * Types of changes that can be detected between documents
 */
export type ChangeType =
  | "added"
  | "removed"
  | "modified"
  | "moved"
  | "unchanged";

/**
 * Represents a single change between two documents
 */
export interface DocumentChange {
  /** Type of change */
  type: ChangeType;
  /** Page number where change occurred */
  pageNumber: number;
  /** Region ID in original document (if applicable) */
  originalRegionId?: string;
  /** Region ID in revised document (if applicable) */
  revisedRegionId?: string;
  /** Original content */
  originalContent?: string;
  /** Revised content */
  revisedContent?: string;
  /** Similarity score between original and revised (0-1) */
  similarity?: number;
  /** Human-readable description of the change */
  description: string;
}

/**
 * Result of comparing two documents
 */
export interface DocumentDiff {
  /** Number of changes detected */
  changeCount: number;
  /** Number of additions */
  additions: number;
  /** Number of deletions */
  deletions: number;
  /** Number of modifications */
  modifications: number;
  /** Overall similarity percentage (0-100) */
  similarity: number;
  /** List of all changes */
  changes: DocumentChange[];
  /** Summary statistics */
  stats: DiffStats;
}

/**
 * Statistics about the diff
 */
export interface DiffStats {
  /** Total regions in original */
  originalRegionCount: number;
  /** Total regions in revised */
  revisedRegionCount: number;
  /** Pages added */
  pagesAdded: number;
  /** Pages removed */
  pagesRemoved: number;
  /** Word count difference */
  wordCountDiff: number;
  /** Characters added */
  charsAdded: number;
  /** Characters removed */
  charsRemoved: number;
}

/**
 * Options for document comparison
 */
export interface CompareOptions {
  /** Ignore whitespace differences (default: true) */
  ignoreWhitespace?: boolean;
  /** Ignore case differences (default: false) */
  ignoreCase?: boolean;
  /** Similarity threshold for "modified" vs "replaced" (default: 0.5) */
  similarityThreshold?: number;
  /** Compare at word level instead of character level (default: false) */
  wordLevel?: boolean;
}

const DEFAULT_OPTIONS: CompareOptions = {
  ignoreWhitespace: true,
  ignoreCase: false,
  similarityThreshold: 0.5,
  wordLevel: false,
};

/**
 * Compare two documents and generate a diff report
 *
 * @param original - The original document
 * @param revised - The revised/updated document
 * @param options - Comparison options
 * @returns DocumentDiff with all changes
 *
 * @example
 * ```typescript
 * const diff = compareDocuments(docV1, docV2);
 * if (diff.similarity < 90) {
 *   console.log("Significant changes detected:");
 *   diff.changes.forEach(c => console.log(`- ${c.description}`));
 * }
 * ```
 */
export function compareDocuments(
  original: DocumentJSON,
  revised: DocumentJSON,
  options: CompareOptions = {}
): DocumentDiff {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const changes: DocumentChange[] = [];

  // Build region maps for efficient lookup
  const originalRegions = buildRegionMap(original);
  const revisedRegions = buildRegionMap(revised);

  // Track matched regions
  const matchedOriginal = new Set<string>();
  const matchedRevised = new Set<string>();

  // Find modifications and unchanged regions
  for (const [key, origRegion] of originalRegions) {
    const content = getRegionText(origRegion.region);

    // Try to find best match in revised
    let bestMatch: {
      key: string;
      region: RegionJSON;
      page: number;
      similarity: number;
    } | null = null;

    for (const [revKey, revRegion] of revisedRegions) {
      if (matchedRevised.has(revKey)) continue;

      const revContent = getRegionText(revRegion.region);
      const sim = calculateSimilarity(content, revContent, opts);

      if (
        sim > (opts.similarityThreshold ?? 0.5) &&
        (!bestMatch || sim > bestMatch.similarity)
      ) {
        bestMatch = {
          key: revKey,
          region: revRegion.region,
          page: revRegion.page,
          similarity: sim,
        };
      }
    }

    if (bestMatch) {
      matchedOriginal.add(key);
      matchedRevised.add(bestMatch.key);

      if (bestMatch.similarity < 1) {
        // Modified
        changes.push({
          type: "modified",
          pageNumber: origRegion.page,
          originalRegionId: origRegion.region.id,
          revisedRegionId: bestMatch.region.id,
          originalContent: content,
          revisedContent: getRegionText(bestMatch.region),
          similarity: bestMatch.similarity,
          description: `Modified ${origRegion.region.type} on page ${origRegion.page}`,
        });
      }
      // else unchanged, no need to record
    }
  }

  // Find removed regions (in original but not matched)
  for (const [key, origRegion] of originalRegions) {
    if (!matchedOriginal.has(key)) {
      const content = getRegionText(origRegion.region);
      changes.push({
        type: "removed",
        pageNumber: origRegion.page,
        originalRegionId: origRegion.region.id,
        originalContent: content,
        description: `Removed ${origRegion.region.type} from page ${origRegion.page}`,
      });
    }
  }

  // Find added regions (in revised but not matched)
  for (const [key, revRegion] of revisedRegions) {
    if (!matchedRevised.has(key)) {
      const content = getRegionText(revRegion.region);
      changes.push({
        type: "added",
        pageNumber: revRegion.page,
        revisedRegionId: revRegion.region.id,
        revisedContent: content,
        description: `Added ${revRegion.region.type} on page ${revRegion.page}`,
      });
    }
  }

  // Calculate statistics
  const stats = calculateStats(original, revised, changes);
  const similarity = calculateOverallSimilarity(
    original,
    revised,
    matchedOriginal.size,
    changes
  );

  return {
    changeCount: changes.length,
    additions: changes.filter((c) => c.type === "added").length,
    deletions: changes.filter((c) => c.type === "removed").length,
    modifications: changes.filter((c) => c.type === "modified").length,
    similarity: Math.round(similarity * 100),
    changes: changes.sort((a, b) => a.pageNumber - b.pageNumber),
    stats,
  };
}

/**
 * Generate a human-readable diff summary
 *
 * @param diff - The document diff to summarize
 * @returns Formatted string summary
 */
export function generateDiffSummary(diff: DocumentDiff): string {
  const lines: string[] = ["=== Document Comparison Summary ===", ""];

  lines.push(`Overall Similarity: ${diff.similarity}%`);
  lines.push(`Total Changes: ${diff.changeCount}`);
  lines.push(`  - Additions: ${diff.additions}`);
  lines.push(`  - Deletions: ${diff.deletions}`);
  lines.push(`  - Modifications: ${diff.modifications}`);
  lines.push("");

  if (diff.stats.pagesAdded > 0 || diff.stats.pagesRemoved > 0) {
    lines.push(
      `Page Changes: +${diff.stats.pagesAdded} / -${diff.stats.pagesRemoved}`
    );
  }

  if (diff.stats.wordCountDiff !== 0) {
    const sign = diff.stats.wordCountDiff > 0 ? "+" : "";
    lines.push(`Word Count Change: ${sign}${diff.stats.wordCountDiff}`);
  }

  lines.push("");
  lines.push("--- Changes by Page ---");

  // Group changes by page
  const byPage = new Map<number, DocumentChange[]>();
  for (const change of diff.changes) {
    const existing = byPage.get(change.pageNumber) || [];
    existing.push(change);
    byPage.set(change.pageNumber, existing);
  }

  for (const [page, pageChanges] of Array.from(byPage.entries()).sort(
    (a, b) => a[0] - b[0]
  )) {
    lines.push(`\nPage ${page}:`);
    for (const change of pageChanges) {
      const icon =
        change.type === "added"
          ? "+"
          : change.type === "removed"
          ? "-"
          : "~";
      lines.push(`  ${icon} ${change.description}`);
    }
  }

  return lines.join("\n");
}

/**
 * Calculate text similarity between two content strings
 *
 * @param text1 - First text string
 * @param text2 - Second text string
 * @param options - Comparison options
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(
  text1: string,
  text2: string,
  options: CompareOptions = {}
): number {
  let a = text1;
  let b = text2;

  if (options.ignoreWhitespace) {
    a = a.replace(/\s+/g, " ").trim();
    b = b.replace(/\s+/g, " ").trim();
  }

  if (options.ignoreCase) {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }

  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  if (options.wordLevel) {
    return calculateWordSimilarity(a, b);
  }

  // Use Levenshtein-based similarity
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}

/**
 * Get changes for a specific page
 *
 * @param diff - The document diff
 * @param pageNumber - Page number to filter by
 * @returns Array of changes for that page
 */
export function getChangesForPage(
  diff: DocumentDiff,
  pageNumber: number
): DocumentChange[] {
  return diff.changes.filter((c) => c.pageNumber === pageNumber);
}

/**
 * Check if a document has significant changes compared to another
 *
 * @param diff - The document diff
 * @param threshold - Similarity threshold (default: 95)
 * @returns True if changes are below the similarity threshold
 */
export function hasSignificantChanges(
  diff: DocumentDiff,
  threshold: number = 95
): boolean {
  return diff.similarity < threshold || diff.changeCount > 0;
}

/**
 * Generate inline diff markup for text content
 *
 * @param original - Original text
 * @param revised - Revised text
 * @returns Object with marked up strings showing additions/deletions
 */
export function generateInlineDiff(
  original: string,
  revised: string
): { original: string; revised: string; unified: string } {
  const origWords = original.split(/\s+/);
  const revWords = revised.split(/\s+/);

  const lcs = longestCommonSubsequence(origWords, revWords);
  const lcsSet = new Set(lcs.map((w, i) => `${i}:${w}`));

  // Mark deletions in original
  let origIdx = 0;
  const origMarked = origWords.map((word) => {
    const key = `${origIdx++}:${word}`;
    return lcsSet.has(key) ? word : `[-${word}-]`;
  });

  // Mark additions in revised
  let revIdx = 0;
  const revMarked = revWords.map((word) => {
    const key = `${revIdx++}:${word}`;
    return lcsSet.has(key) ? word : `[+${word}+]`;
  });

  // Generate unified diff
  const unified: string[] = [];
  let origPtr = 0;
  let revPtr = 0;

  while (origPtr < origWords.length || revPtr < revWords.length) {
    if (origPtr < origWords.length && revPtr < revWords.length) {
      if (origWords[origPtr] === revWords[revPtr]) {
        unified.push(origWords[origPtr]);
        origPtr++;
        revPtr++;
      } else {
        unified.push(`[-${origWords[origPtr]}-]`);
        unified.push(`[+${revWords[revPtr]}+]`);
        origPtr++;
        revPtr++;
      }
    } else if (origPtr < origWords.length) {
      unified.push(`[-${origWords[origPtr]}-]`);
      origPtr++;
    } else {
      unified.push(`[+${revWords[revPtr]}+]`);
      revPtr++;
    }
  }

  return {
    original: origMarked.join(" "),
    revised: revMarked.join(" "),
    unified: unified.join(" "),
  };
}

// --- Helper Functions ---

function buildRegionMap(
  doc: DocumentJSON
): Map<string, { region: RegionJSON; page: number }> {
  const map = new Map<string, { region: RegionJSON; page: number }>();

  for (const page of doc.pages) {
    for (const region of page.regions) {
      map.set(region.id, { region, page: page.pageNumber });
    }
  }

  return map;
}

function getRegionText(region: RegionJSON): string {
  if (region.type === "text" || region.type === "heading") {
    return region.content.text || "";
  }
  if (region.type === "math") {
    return region.content.latex || "";
  }
  if (region.type === "table") {
    // Tables are stored as text representation in the content
    return region.content.text || "";
  }
  return "";
}

function calculateStats(
  original: DocumentJSON,
  revised: DocumentJSON,
  changes: DocumentChange[]
): DiffStats {
  const originalRegionCount = original.pages.reduce(
    (sum, p) => sum + p.regions.length,
    0
  );
  const revisedRegionCount = revised.pages.reduce(
    (sum, p) => sum + p.regions.length,
    0
  );

  const originalWords = countDocumentWords(original);
  const revisedWords = countDocumentWords(revised);

  const charsAdded = changes
    .filter((c) => c.type === "added")
    .reduce((sum, c) => sum + (c.revisedContent?.length || 0), 0);

  const charsRemoved = changes
    .filter((c) => c.type === "removed")
    .reduce((sum, c) => sum + (c.originalContent?.length || 0), 0);

  return {
    originalRegionCount,
    revisedRegionCount,
    pagesAdded: Math.max(0, revised.pages.length - original.pages.length),
    pagesRemoved: Math.max(0, original.pages.length - revised.pages.length),
    wordCountDiff: revisedWords - originalWords,
    charsAdded,
    charsRemoved,
  };
}

function countDocumentWords(doc: DocumentJSON): number {
  let count = 0;
  for (const page of doc.pages) {
    for (const region of page.regions) {
      const text = getRegionText(region);
      count += text.split(/\s+/).filter((w) => w.length > 0).length;
    }
  }
  return count;
}

function calculateOverallSimilarity(
  original: DocumentJSON,
  revised: DocumentJSON,
  matchedCount: number,
  changes: DocumentChange[]
): number {
  const originalCount = original.pages.reduce(
    (sum, p) => sum + p.regions.length,
    0
  );
  const revisedCount = revised.pages.reduce(
    (sum, p) => sum + p.regions.length,
    0
  );

  if (originalCount === 0 && revisedCount === 0) return 1;

  const totalRegions = Math.max(originalCount, revisedCount);
  const unchangedCount = matchedCount - changes.filter((c) => c.type === "modified").length;

  // Base similarity from unchanged regions
  let similarity = unchangedCount / totalRegions;

  // Add partial credit for modifications
  const modificationCredit = changes
    .filter((c) => c.type === "modified")
    .reduce((sum, c) => sum + (c.similarity || 0), 0);

  similarity += (modificationCredit * 0.5) / totalRegions;

  return Math.min(1, Math.max(0, similarity));
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function calculateWordSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 1;
}

function longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
