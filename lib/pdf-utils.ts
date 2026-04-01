/**
 * @fileoverview PDF utilities for extracting pages as images
 * @module lib/pdf-utils
 *
 * Note: For production, you may want to use pdf-to-img or similar library
 * that wraps poppler or mupdf for better PDF rendering.
 *
 * For now, we'll send PDFs directly to the ML service which handles them.
 */

import { PDFDocument } from "pdf-lib";

/**
 * Basic metadata information extracted from a PDF document.
 */
export interface PDFInfo {
  /** Total number of pages in the PDF */
  pageCount: number;
  /** Document title from PDF metadata, if available */
  title?: string;
  /** Document author from PDF metadata, if available */
  author?: string;
}

/**
 * Extracts basic metadata information from a PDF buffer.
 *
 * @param pdfBuffer - The PDF file contents as a Buffer
 * @returns Promise resolving to PDF metadata including page count, title, and author
 * @throws Error if the PDF cannot be parsed
 *
 * @example
 * ```ts
 * const pdfInfo = await getPDFInfo(fileBuffer);
 * console.log(`PDF has ${pdfInfo.pageCount} pages`);
 * ```
 */
export async function getPDFInfo(pdfBuffer: Buffer): Promise<PDFInfo> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  return {
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle() || undefined,
    author: pdfDoc.getAuthor() || undefined,
  };
}

/**
 * Extracts a single page from a PDF and returns it as a new PDF buffer.
 *
 * @param pdfBuffer - The source PDF file contents as a Buffer
 * @param pageNumber - Zero-indexed page number to extract
 * @returns Promise resolving to a Buffer containing a new PDF with only the specified page
 * @throws Error if the page number is out of range
 *
 * @example
 * ```ts
 * // Extract the first page (index 0)
 * const singlePagePdf = await extractPage(pdfBuffer, 0);
 * ```
 */
export async function extractPage(
  pdfBuffer: Buffer,
  pageNumber: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  if (pageNumber < 0 || pageNumber >= pdfDoc.getPageCount()) {
    throw new Error(
      `Invalid page number ${pageNumber}. PDF has ${pdfDoc.getPageCount()} pages.`
    );
  }

  // Create a new PDF with just this page
  const newDoc = await PDFDocument.create();
  const [copiedPage] = await newDoc.copyPages(pdfDoc, [pageNumber]);
  newDoc.addPage(copiedPage);

  const bytes = await newDoc.save();
  return Buffer.from(bytes);
}

/**
 * Gets the width and height dimensions of a specific PDF page.
 *
 * @param pdfBuffer - The PDF file contents as a Buffer
 * @param pageNumber - Zero-indexed page number (defaults to 0, the first page)
 * @returns Promise resolving to an object with width and height in PDF points
 *
 * @example
 * ```ts
 * const { width, height } = await getPageDimensions(pdfBuffer);
 * console.log(`Page size: ${width}x${height} points`);
 * ```
 */
export async function getPageDimensions(
  pdfBuffer: Buffer,
  pageNumber: number = 0
): Promise<{ width: number; height: number }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
  });

  const page = pdfDoc.getPage(pageNumber);
  const { width, height } = page.getSize();

  return { width, height };
}

/**
 * Checks if a buffer contains a valid PDF file by examining magic bytes.
 * PDF files start with the signature "%PDF-".
 *
 * @param buffer - The file contents as a Buffer to check
 * @returns True if the buffer starts with PDF magic bytes, false otherwise
 *
 * @example
 * ```ts
 * if (isPDF(fileBuffer)) {
 *   const info = await getPDFInfo(fileBuffer);
 * }
 * ```
 */
export function isPDF(buffer: Buffer): boolean {
  // PDF files start with %PDF-
  const header = buffer.slice(0, 5).toString("ascii");
  return header === "%PDF-";
}

/**
 * Detects the image type of a buffer by examining magic bytes.
 * Supports JPEG, PNG, GIF, and WebP formats.
 *
 * @param buffer - The file contents as a Buffer to check
 * @returns The image type string ("jpeg", "png", "gif", "webp") or null if not a recognized image
 *
 * @example
 * ```ts
 * const imageType = getImageType(fileBuffer);
 * if (imageType === "png") {
 *   console.log("Processing PNG image");
 * }
 * ```
 */
export function getImageType(buffer: Buffer): string | null {
  const header = buffer.slice(0, 8);

  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  ) {
    return "png";
  }

  // GIF: 47 49 46 38
  if (
    header[0] === 0x47 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x38
  ) {
    return "gif";
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46
  ) {
    return "webp";
  }

  return null;
}
