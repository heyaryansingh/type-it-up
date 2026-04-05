/**
 * @fileoverview OCR Service - Calls the ML backend (Marker) for document processing.
 *
 * Marker outputs markdown with embedded LaTeX and images.
 * This service parses that output into our canonical JSON format.
 * @module lib/ocr-service
 */

import { convertDocument, healthCheck, isMLConfigured } from "./ml-client";
import type { DocumentJSON, PageJSON, RegionJSON, BoundingBox } from "./types";

export interface ProcessingOptions {
  extractFigures?: boolean;
  enhanceContrast?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  document?: DocumentJSON;
  rawMarkdown?: string;
  error?: string;
}

/**
 * Process a document through the ML service.
 *
 * If the ML service is not configured, returns a demo document for testing.
 *
 * @param {File | Blob} file - The document file to process (PDF or image)
 * @param {string} filename - The name of the file
 * @param {string} projectId - Unique identifier for the project
 * @param {ProcessingOptions} options - Optional processing configuration
 * @returns {Promise<ProcessingResult>} Processing result with document or error
 * @example
 * ```typescript
 * const result = await processDocument(pdfFile, 'notes.pdf', 'proj-123');
 * if (result.success && result.document) {
 *   console.log(`Processed ${result.document.pages.length} pages`);
 * }
 * ```
 */
export async function processDocument(
  file: File | Blob,
  filename: string,
  projectId: string,
  options: ProcessingOptions = {}
): Promise<ProcessingResult> {
  // Check if ML service is configured
  if (!isMLConfigured()) {
    // Return demo document when ML not configured
    return {
      success: true,
      document: createDemoDocument(projectId, filename),
      rawMarkdown: getDemoMarkdown(),
    };
  }

  try {
    // Call ML service
    const result = await convertDocument(file, filename);

    if (result.status !== "ready" && !result.markdown) {
      return {
        success: false,
        error: result.error || "ML service returned no content",
      };
    }

    // Parse markdown into our canonical format
    const document = parseMarkdownToDocument(
      result.markdown || "",
      projectId,
      result.images || []
    );

    return {
      success: true,
      document,
      rawMarkdown: result.markdown,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Create a demo document for when ML service isn't configured
 */
function createDemoDocument(projectId: string, filename: string): DocumentJSON {
  return {
    projectId,
    title: filename.replace(/\.[^.]+$/, ""),
    pages: [
      {
        pageNumber: 1,
        width: 800,
        height: 1000,
        regions: [
          {
            id: `region-${projectId}-1-1`,
            type: "text",
            bbox: { x: 5, y: 5, width: 90, height: 10 },
            confidence: 0.95,
            readingOrder: 0,
            content: {
              text: "Introduction to Calculus",
            },
          },
          {
            id: `region-${projectId}-1-2`,
            type: "text",
            bbox: { x: 5, y: 18, width: 90, height: 15 },
            confidence: 0.85,
            readingOrder: 1,
            content: {
              text: "The fundamental theorem of calculus establishes the relationship between differentiation and integration. Consider the following integral:",
            },
          },
          {
            id: `region-${projectId}-1-3`,
            type: "math",
            bbox: { x: 10, y: 35, width: 80, height: 12 },
            confidence: 0.92,
            readingOrder: 2,
            content: {
              latex: "\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)",
            },
          },
          {
            id: `region-${projectId}-1-4`,
            type: "text",
            bbox: { x: 5, y: 50, width: 90, height: 12 },
            confidence: 0.88,
            readingOrder: 3,
            content: {
              text: "where $F(x)$ is the antiderivative of $f(x)$. This leads to the important result:",
            },
          },
          {
            id: `region-${projectId}-1-5`,
            type: "math",
            bbox: { x: 10, y: 65, width: 80, height: 15 },
            confidence: 0.90,
            readingOrder: 4,
            content: {
              latex: "\\frac{d}{dx} \\int_{a}^{x} f(t) \\, dt = f(x)",
            },
          },
          {
            id: `region-${projectId}-1-6`,
            type: "figure",
            bbox: { x: 20, y: 82, width: 60, height: 15 },
            confidence: 0.85,
            readingOrder: 5,
            content: {
              imagePath: "figures/graph.png",
            },
          },
        ],
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      totalPages: 1,
    },
  };
}

/**
 * Get demo markdown content
 */
function getDemoMarkdown(): string {
  return `# Introduction to Calculus

The fundamental theorem of calculus establishes the relationship between differentiation and integration. Consider the following integral:

$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

where $F(x)$ is the antiderivative of $f(x)$. This leads to the important result:

$$
\\frac{d}{dx} \\int_{a}^{x} f(t) \\, dt = f(x)
$$

![Graph](figures/graph.png)
`;
}

/**
 * Parse markdown output from Marker into our canonical JSON format
 */
function parseMarkdownToDocument(
  markdown: string,
  projectId: string,
  images: { path: string; data: string }[]
): DocumentJSON {
  const pages: PageJSON[] = [];
  const regions: RegionJSON[] = [];

  // Split by page markers if present, otherwise treat as single page
  const pageContents = markdown.split(/\n---\n/).filter(Boolean);

  let globalReadingOrder = 0;

  pageContents.forEach((pageContent, pageIndex) => {
    const pageRegions: RegionJSON[] = [];

    // Parse different content types
    const lines = pageContent.split("\n");
    let currentRegion: Partial<RegionJSON> | null = null;
    let lineNumber = 0;

    for (const line of lines) {
      lineNumber++;

      // Detect math blocks ($$...$$)
      if (line.trim().startsWith("$$")) {
        if (currentRegion) {
          pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
        }
        currentRegion = {
          id: `region-${projectId}-${pageIndex}-${lineNumber}`,
          type: "math",
          bbox: estimateBbox(lineNumber, lines.length),
          confidence: 0.85,
          content: { latex: "" },
        };
        continue;
      }

      if (line.trim().endsWith("$$") && currentRegion?.type === "math") {
        currentRegion.content!.latex += line.replace(/\$\$/g, "");
        pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
        currentRegion = null;
        continue;
      }

      if (currentRegion?.type === "math") {
        currentRegion.content!.latex += line + "\n";
        continue;
      }

      // Detect inline math ($...$)
      const inlineMathMatch = line.match(/\$([^$]+)\$/g);

      // Detect images
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        if (currentRegion) {
          pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
          currentRegion = null;
        }
        pageRegions.push({
          id: `region-${projectId}-${pageIndex}-${lineNumber}`,
          type: "figure",
          bbox: estimateBbox(lineNumber, lines.length),
          confidence: 0.9,
          readingOrder: globalReadingOrder++,
          content: {
            imagePath: imageMatch[2],
          },
        });
        continue;
      }

      // Detect headers (potential section titles)
      if (line.match(/^#{1,6}\s/)) {
        if (currentRegion) {
          pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
        }
        currentRegion = {
          id: `region-${projectId}-${pageIndex}-${lineNumber}`,
          type: "text",
          bbox: estimateBbox(lineNumber, lines.length),
          confidence: 0.95,
          content: { text: line.replace(/^#+\s*/, "") },
        };
        pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
        currentRegion = null;
        continue;
      }

      // Regular text with potential inline math
      if (line.trim()) {
        if (!currentRegion || currentRegion.type !== "text") {
          if (currentRegion) {
            pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
          }
          currentRegion = {
            id: `region-${projectId}-${pageIndex}-${lineNumber}`,
            type: "text",
            bbox: estimateBbox(lineNumber, lines.length),
            confidence: 0.85,
            content: { text: "" },
          };
        }
        currentRegion.content!.text = (currentRegion.content!.text || "") + line + "\n";
      }
    }

    // Finalize any remaining region
    if (currentRegion) {
      pageRegions.push(finalizeRegion(currentRegion, globalReadingOrder++));
    }

    pages.push({
      pageNumber: pageIndex + 1,
      width: 0, // Will be filled from actual image dimensions
      height: 0,
      regions: pageRegions,
    });
  });

  return {
    projectId,
    pages,
    metadata: {
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      totalPages: pages.length,
    },
  };
}

function finalizeRegion(
  partial: Partial<RegionJSON>,
  readingOrder: number
): RegionJSON {
  return {
    id: partial.id || `region-${Date.now()}`,
    type: partial.type || "text",
    bbox: partial.bbox || { x: 0, y: 0, width: 100, height: 100 },
    confidence: partial.confidence || 0.5,
    readingOrder,
    content: partial.content || {},
  };
}

function estimateBbox(lineNumber: number, totalLines: number): BoundingBox {
  // Rough estimation based on line position
  const lineHeight = 100 / Math.max(totalLines, 1);
  return {
    x: 5,
    y: (lineNumber - 1) * lineHeight,
    width: 90,
    height: lineHeight,
  };
}

/**
 * Check if the ML service is available and responding.
 *
 * @returns {Promise<boolean>} True if the service is healthy, false otherwise
 * @example
 * ```typescript
 * const isHealthy = await checkMLServiceHealth();
 * if (!isHealthy) {
 *   console.warn('ML service unavailable, using demo mode');
 * }
 * ```
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}
