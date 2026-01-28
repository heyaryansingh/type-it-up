/**
 * Core types for the document processing pipeline
 */

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "uploading" | "processing" | "ready" | "error";
  pages: Page[];
}

export interface Page {
  id: string;
  projectId: string;
  pageNumber: number;
  originalPath: string;
  processedPath?: string;
  thumbnailPath?: string;
  width: number;
  height: number;
  status: "uploaded" | "preprocessing" | "processed" | "error";
  regions?: Region[];
}

export interface Region {
  id: string;
  pageId: string;
  type: "text" | "math" | "figure" | "table";
  bbox: BoundingBox;
  confidence: number;
  content?: string; // OCR result for text/math, path for figure
  latex?: string; // For math regions
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProcessingResult {
  success: boolean;
  pageId: string;
  processedPath?: string;
  thumbnailPath?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  projectId: string;
  pages: {
    id: string;
    pageNumber: number;
    originalPath: string;
  }[];
  error?: string;
}

/**
 * Canonical JSON format for document representation
 * This is the intermediate format between OCR and output rendering
 */
export interface DocumentJSON {
  projectId: string;
  title?: string;
  pages: PageJSON[];
  metadata: {
    createdAt: string;
    processedAt?: string;
    totalPages: number;
    originalImage?: string;
  };
}

export interface PageJSON {
  pageNumber: number;
  width: number;
  height: number;
  regions: RegionJSON[];
}

export interface RegionJSON {
  id: string;
  type: "text" | "math" | "figure" | "table";
  bbox: BoundingBox;
  confidence: number;
  readingOrder: number;
  content: {
    text?: string;
    latex?: string;
    imagePath?: string;
  };
  // Diagram-specific metadata
  diagramType?: "graph" | "venn" | "flowchart" | "geometry" | "circuit" | "unknown";
  diagramDescription?: string;
}
