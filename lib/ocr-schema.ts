/**
 * @fileoverview OCR Schema - Type definitions for OCR document structure
 * @module lib/ocr-schema
 *
 * Defines the data structures for representing OCR-processed documents,
 * including regions, pages, and document metadata.
 *
 * @example
 * ```typescript
 * import { OcrDocument, OcrPage, OcrRegion, RegionType } from './ocr-schema';
 *
 * const region: OcrRegion = {
 *   id: 'region-1',
 *   pageIndex: 0,
 *   type: 'paragraph',
 *   bbox: [0, 0, 100, 50],
 *   text: 'Hello world',
 * };
 * ```
 */

/**
 * Supported region types in OCR documents
 * @typedef {string} RegionType
 */
export type RegionType =
  | "title"
  | "paragraph"
  | "math_inline"
  | "math_block"
  | "figure"
  | "table"
  | "code"
  | "header"
  | "footer"
  | "list"
  | "caption"
  | "unknown";

/**
 * Bounding box coordinates [x, y, width, height]
 * @typedef {[number, number, number, number]} BoundingBox
 */
export type BoundingBox = [number, number, number, number];

/**
 * A detected region within an OCR page
 * @interface OcrRegion
 * @property {string} id - Unique identifier for the region
 * @property {number} pageIndex - Zero-based index of the page containing this region
 * @property {RegionType} type - Classification of the region content
 * @property {BoundingBox} bbox - Bounding box coordinates [x, y, width, height]
 * @property {number} [confidence] - OCR confidence score (0-1)
 * @property {number} [order] - Reading order within the page
 * @property {string} [text] - Extracted text content
 * @property {string} [latex] - LaTeX representation for math regions
 * @property {string} [assetPath] - Path to extracted figure/image asset
 * @property {Record<string, string | number | boolean | null>} [attributes] - Additional metadata
 */
export interface OcrRegion {
  id: string;
  pageIndex: number;
  type: RegionType;
  bbox: BoundingBox;
  confidence?: number;
  order?: number;
  text?: string;
  latex?: string;
  assetPath?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

/**
 * A single page in an OCR document
 * @interface OcrPage
 * @property {number} index - Zero-based page index
 * @property {number} width - Page width in pixels
 * @property {number} height - Page height in pixels
 * @property {number} [rotation] - Page rotation in degrees (0, 90, 180, 270)
 * @property {OcrRegion[]} regions - Detected regions on this page
 */
export interface OcrPage {
  index: number;
  width: number;
  height: number;
  rotation?: number;
  regions: OcrRegion[];
}

/**
 * Source metadata for an OCR document
 * @interface OcrDocumentSource
 * @property {"pdf" | "image"} kind - Type of source document
 * @property {string} [fileName] - Original file name
 * @property {number} pageCount - Total number of pages in the source
 */
export interface OcrDocumentSource {
  kind: "pdf" | "image";
  fileName?: string;
  pageCount: number;
}

/**
 * Complete OCR document structure
 * @interface OcrDocument
 * @property {string} id - Unique document identifier
 * @property {"0.1"} version - Schema version
 * @property {string} createdAt - ISO 8601 timestamp of document creation
 * @property {OcrDocumentSource} source - Source document metadata
 * @property {OcrPage[]} pages - Array of processed pages
 * @property {string[]} [languages] - Detected languages in the document
 */
export interface OcrDocument {
  id: string;
  version: "0.1";
  createdAt: string;
  source: OcrDocumentSource;
  pages: OcrPage[];
  languages?: string[];
}
