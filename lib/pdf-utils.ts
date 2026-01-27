/**
 * PDF utilities for extracting pages as images
 *
 * Note: For production, you may want to use pdf-to-img or similar library
 * that wraps poppler or mupdf for better PDF rendering.
 *
 * For now, we'll send PDFs directly to the ML service which handles them.
 */

import { PDFDocument } from "pdf-lib";

export interface PDFInfo {
  pageCount: number;
  title?: string;
  author?: string;
}

/**
 * Get basic info about a PDF
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
 * Extract a single page from a PDF as a new PDF buffer
 */
export async function extractPage(
  pdfBuffer: Buffer,
  pageNumber: number // 0-indexed
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
 * Get dimensions of a PDF page
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
 * Check if file is a valid PDF
 */
export function isPDF(buffer: Buffer): boolean {
  // PDF files start with %PDF-
  const header = buffer.slice(0, 5).toString("ascii");
  return header === "%PDF-";
}

/**
 * Check if file is an image based on magic bytes
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
