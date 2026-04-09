/**
 * @fileoverview Document Statistics and Analysis Utilities
 * @module lib/document-stats
 *
 * Provides functions for analyzing document structure, content metrics,
 * and quality assessment without requiring external APIs.
 *
 * @example
 * ```typescript
 * import { getDocumentStats, assessQuality } from './document-stats';
 *
 * const stats = getDocumentStats(document);
 * console.log(`Document has ${stats.totalRegions} regions`);
 *
 * const quality = assessQuality(document);
 * console.log(`Quality score: ${quality.overallScore}%`);
 * ```
 */

import type { DocumentJSON, RegionJSON, PageJSON } from "./types";

export interface DocumentStats {
  /** Total number of pages */
  totalPages: number;
  /** Total number of content regions */
  totalRegions: number;
  /** Breakdown of regions by type */
  regionsByType: Record<string, number>;
  /** Estimated word count (text regions only) */
  estimatedWordCount: number;
  /** Number of math equations/expressions */
  mathExpressionCount: number;
  /** Number of figures/images */
  figureCount: number;
  /** Average regions per page */
  avgRegionsPerPage: number;
  /** Average confidence score across all regions */
  avgConfidence: number;
  /** Lowest confidence score found */
  minConfidence: number;
  /** Regions with confidence below threshold */
  lowConfidenceCount: number;
}

export interface QualityAssessment {
  /** Overall quality score (0-100) */
  overallScore: number;
  /** Individual quality metrics */
  metrics: {
    /** Confidence-based score */
    confidenceScore: number;
    /** Structure completeness score */
    structureScore: number;
    /** Content density score */
    contentScore: number;
    /** Math rendering score */
    mathScore: number;
  };
  /** Quality issues found */
  issues: QualityIssue[];
  /** Suggested improvements */
  suggestions: string[];
}

export interface QualityIssue {
  type: "low_confidence" | "empty_region" | "invalid_latex" | "missing_content";
  severity: "warning" | "error";
  pageNumber: number;
  regionId: string;
  message: string;
}

const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Calculate comprehensive statistics for a document
 *
 * @param document - The document to analyze
 * @returns DocumentStats with content metrics
 *
 * @example
 * ```typescript
 * const stats = getDocumentStats(document);
 * if (stats.lowConfidenceCount > 0) {
 *   console.log(`${stats.lowConfidenceCount} regions need review`);
 * }
 * ```
 */
export function getDocumentStats(document: DocumentJSON): DocumentStats {
  const regionsByType: Record<string, number> = {};
  let totalRegions = 0;
  let totalConfidence = 0;
  let minConfidence = 1;
  let lowConfidenceCount = 0;
  let wordCount = 0;
  let mathCount = 0;
  let figureCount = 0;

  for (const page of document.pages) {
    for (const region of page.regions) {
      totalRegions++;

      // Track by type
      const type = region.type;
      regionsByType[type] = (regionsByType[type] || 0) + 1;

      // Track confidence
      totalConfidence += region.confidence;
      if (region.confidence < minConfidence) {
        minConfidence = region.confidence;
      }
      if (region.confidence < LOW_CONFIDENCE_THRESHOLD) {
        lowConfidenceCount++;
      }

      // Count by content type
      if (region.type === "text" && region.content.text) {
        wordCount += countWords(region.content.text);
      } else if (region.type === "math") {
        mathCount++;
      } else if (region.type === "figure") {
        figureCount++;
      }
    }
  }

  return {
    totalPages: document.pages.length,
    totalRegions,
    regionsByType,
    estimatedWordCount: wordCount,
    mathExpressionCount: mathCount,
    figureCount,
    avgRegionsPerPage:
      document.pages.length > 0 ? totalRegions / document.pages.length : 0,
    avgConfidence: totalRegions > 0 ? totalConfidence / totalRegions : 0,
    minConfidence: totalRegions > 0 ? minConfidence : 0,
    lowConfidenceCount,
  };
}

/**
 * Assess document quality and identify issues
 *
 * @param document - The document to assess
 * @param confidenceThreshold - Minimum acceptable confidence (default: 0.7)
 * @returns QualityAssessment with scores and issues
 *
 * @example
 * ```typescript
 * const quality = assessQuality(document);
 * if (quality.overallScore < 80) {
 *   console.log("Document quality needs improvement:");
 *   quality.suggestions.forEach(s => console.log(`- ${s}`));
 * }
 * ```
 */
export function assessQuality(
  document: DocumentJSON,
  confidenceThreshold: number = LOW_CONFIDENCE_THRESHOLD
): QualityAssessment {
  const issues: QualityIssue[] = [];
  const suggestions: string[] = [];

  let totalConfidence = 0;
  let regionCount = 0;
  let emptyRegions = 0;
  let invalidLatex = 0;
  let mathRegions = 0;
  let validMathRegions = 0;

  // Analyze each page and region
  for (const page of document.pages) {
    for (const region of page.regions) {
      regionCount++;
      totalConfidence += region.confidence;

      // Check for low confidence
      if (region.confidence < confidenceThreshold) {
        issues.push({
          type: "low_confidence",
          severity: region.confidence < 0.5 ? "error" : "warning",
          pageNumber: page.pageNumber,
          regionId: region.id,
          message: `Low OCR confidence: ${(region.confidence * 100).toFixed(1)}%`,
        });
      }

      // Check for empty content
      if (isEmptyRegion(region)) {
        emptyRegions++;
        issues.push({
          type: "empty_region",
          severity: "warning",
          pageNumber: page.pageNumber,
          regionId: region.id,
          message: `Empty ${region.type} region detected`,
        });
      }

      // Check math regions for valid LaTeX
      if (region.type === "math") {
        mathRegions++;
        if (region.content.latex) {
          if (hasBasicLatexErrors(region.content.latex)) {
            invalidLatex++;
            issues.push({
              type: "invalid_latex",
              severity: "warning",
              pageNumber: page.pageNumber,
              regionId: region.id,
              message: "Potentially invalid LaTeX syntax detected",
            });
          } else {
            validMathRegions++;
          }
        } else {
          issues.push({
            type: "missing_content",
            severity: "error",
            pageNumber: page.pageNumber,
            regionId: region.id,
            message: "Math region without LaTeX content",
          });
        }
      }
    }
  }

  // Calculate individual scores
  const avgConfidence = regionCount > 0 ? totalConfidence / regionCount : 0;
  const confidenceScore = avgConfidence * 100;

  const emptyRatio = regionCount > 0 ? emptyRegions / regionCount : 0;
  const structureScore = Math.max(0, 100 - emptyRatio * 200);

  const contentScore = calculateContentScore(document);

  const mathScore =
    mathRegions > 0 ? (validMathRegions / mathRegions) * 100 : 100;

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    confidenceScore * 0.4 +
      structureScore * 0.2 +
      contentScore * 0.2 +
      mathScore * 0.2
  );

  // Generate suggestions based on issues
  if (avgConfidence < 0.8) {
    suggestions.push(
      "Consider re-processing pages with low confidence using higher resolution images"
    );
  }
  if (emptyRegions > 0) {
    suggestions.push(
      `Review ${emptyRegions} empty regions - they may need manual content entry`
    );
  }
  if (invalidLatex > 0) {
    suggestions.push(
      `Review ${invalidLatex} math expressions with potential LaTeX errors`
    );
  }
  if (document.pages.length === 0) {
    suggestions.push("Document has no pages - upload content to begin");
  }

  return {
    overallScore,
    metrics: {
      confidenceScore: Math.round(confidenceScore),
      structureScore: Math.round(structureScore),
      contentScore: Math.round(contentScore),
      mathScore: Math.round(mathScore),
    },
    issues,
    suggestions,
  };
}

/**
 * Get a summary of document content for display
 *
 * @param document - The document to summarize
 * @returns Human-readable summary string
 */
export function getDocumentSummary(document: DocumentJSON): string {
  const stats = getDocumentStats(document);

  const parts: string[] = [
    `${stats.totalPages} page${stats.totalPages !== 1 ? "s" : ""}`,
  ];

  if (stats.estimatedWordCount > 0) {
    parts.push(`~${stats.estimatedWordCount} words`);
  }
  if (stats.mathExpressionCount > 0) {
    parts.push(`${stats.mathExpressionCount} equations`);
  }
  if (stats.figureCount > 0) {
    parts.push(`${stats.figureCount} figure${stats.figureCount !== 1 ? "s" : ""}`);
  }

  return parts.join(" • ");
}

/**
 * Find regions that need manual review
 *
 * @param document - The document to analyze
 * @param confidenceThreshold - Minimum confidence to pass (default: 0.7)
 * @returns Array of regions needing review with page context
 */
export function getRegionsNeedingReview(
  document: DocumentJSON,
  confidenceThreshold: number = LOW_CONFIDENCE_THRESHOLD
): Array<{ page: PageJSON; region: RegionJSON }> {
  const results: Array<{ page: PageJSON; region: RegionJSON }> = [];

  for (const page of document.pages) {
    for (const region of page.regions) {
      if (
        region.confidence < confidenceThreshold ||
        isEmptyRegion(region) ||
        (region.type === "math" && hasBasicLatexErrors(region.content.latex || ""))
      ) {
        results.push({ page, region });
      }
    }
  }

  // Sort by confidence (lowest first)
  return results.sort((a, b) => a.region.confidence - b.region.confidence);
}

// --- Helper Functions ---

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function isEmptyRegion(region: RegionJSON): boolean {
  if (region.type === "text" || region.type === "heading") {
    return !region.content.text || region.content.text.trim().length === 0;
  }
  if (region.type === "math") {
    return !region.content.latex || region.content.latex.trim().length === 0;
  }
  if (region.type === "figure") {
    return !region.content.imagePath && !region.content.snapshot;
  }
  return false;
}

function hasBasicLatexErrors(latex: string): boolean {
  if (!latex) return true;

  // Check for unmatched braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (braceCount < 0) return true;
  }
  if (braceCount !== 0) return true;

  // Check for empty fractions
  if (/\\frac\s*\{\s*\}/.test(latex)) return true;

  // Check for consecutive operators (likely OCR error)
  if (/[+\-*/^]{3,}/.test(latex)) return true;

  return false;
}

function calculateContentScore(document: DocumentJSON): number {
  if (document.pages.length === 0) return 0;

  let totalContent = 0;
  let totalRegions = 0;

  for (const page of document.pages) {
    for (const region of page.regions) {
      totalRegions++;

      if (region.type === "text" && region.content.text) {
        totalContent += Math.min(region.content.text.length, 500);
      } else if (region.type === "math" && region.content.latex) {
        totalContent += Math.min(region.content.latex.length * 2, 500);
      } else if (region.type === "figure" && region.content.imagePath) {
        totalContent += 100;
      }
    }
  }

  if (totalRegions === 0) return 0;

  // Score based on average content per region (target: 100+ chars)
  const avgContent = totalContent / totalRegions;
  return Math.min(100, avgContent);
}
