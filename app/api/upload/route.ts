import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { preprocessImage, generateThumbnail } from "@/lib/preprocessing";
import { getPDFInfo, isPDF, getImageType } from "@/lib/pdf-utils";
import { uploadToBucket, RAW_BUCKET, PAGES_BUCKET, isStorageConfigured } from "@/lib/storage";
import { validateFile } from "@/lib/file-validation";
import type { UploadResult, Page } from "@/lib/types";

export const runtime = "nodejs";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Max combined size of one request. Per-file limits alone leave the request
// unbounded, and every buffer is held in memory at once during validation.
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

// Max files per request, so a flood of tiny files cannot pin the event loop.
const MAX_FILES = 50;

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: `Too many files: ${files.length} exceeds the limit of ${MAX_FILES}` },
        { status: 400 }
      );
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Combined upload of ${(totalSize / 1024 / 1024).toFixed(1)}MB exceeds the ${MAX_TOTAL_SIZE / 1024 / 1024}MB request limit`,
        },
        { status: 400 }
      );
    }

    // Validate against the file's actual bytes, not its declared Content-Type,
    // which the client controls. Buffers are read once here and reused below.
    const buffers = new Map<File, Buffer>();
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      buffers.set(file, buffer);

      const validation = await validateFile(file, buffer, {
        maxFileSize: MAX_FILE_SIZE,
        allowedTypes: ALLOWED_TYPES,
      });

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `File ${file.name}: ${validation.errors.join("; ")}` },
          { status: 400 }
        );
      }
    }

    const projectId = uuidv4();
    const pages: Page[] = [];
    let pageNumber = 1;

    for (const file of files) {
      const buffer = buffers.get(file)!;

      if (isPDF(buffer)) {
        // Handle PDF: get page count and process each page
        const pdfInfo = await getPDFInfo(buffer);

        // Store original PDF
        const originalPath = `${projectId}/original/${file.name}`;
        if (isStorageConfigured()) {
          await uploadToBucket({
            bucket: RAW_BUCKET,
            path: originalPath,
            data: buffer,
            contentType: "application/pdf",
          });
        }

        // For now, we'll send the entire PDF to the ML service
        // and let it extract pages. Track as a single "page" entry.
        for (let i = 0; i < pdfInfo.pageCount; i++) {
          const pageId = uuidv4();
          pages.push({
            id: pageId,
            projectId,
            pageNumber: pageNumber++,
            originalPath,
            width: 0, // Will be updated after processing
            height: 0,
            status: "uploaded",
          });
        }
      } else {
        // Handle image
        const imageType = getImageType(buffer);
        if (!imageType) {
          // Validation passed the magic-number check, so an unrecognized type
          // here means the two detectors disagree. Fail loudly rather than
          // dropping the page and returning a short result the caller cannot
          // account for.
          return NextResponse.json(
            { success: false, error: `File ${file.name} is not a supported image or PDF` },
            { status: 400 }
          );
        }

        const pageId = uuidv4();
        const originalPath = `${projectId}/original/${pageId}.${imageType}`;

        // Store original
        if (isStorageConfigured()) {
          await uploadToBucket({
            bucket: RAW_BUCKET,
            path: originalPath,
            data: buffer,
            contentType: file.type,
          });
        }

        // Preprocess image
        const processed = await preprocessImage(buffer);
        const processedPath = `${projectId}/processed/${pageId}.png`;

        if (isStorageConfigured()) {
          await uploadToBucket({
            bucket: PAGES_BUCKET,
            path: processedPath,
            data: processed.buffer,
            contentType: "image/png",
          });
        }

        // Generate thumbnail
        const thumbnail = await generateThumbnail(processed.buffer);
        const thumbnailPath = `${projectId}/thumbnails/${pageId}.jpg`;

        if (isStorageConfigured()) {
          await uploadToBucket({
            bucket: PAGES_BUCKET,
            path: thumbnailPath,
            data: thumbnail,
            contentType: "image/jpeg",
          });
        }

        pages.push({
          id: pageId,
          projectId,
          pageNumber: pageNumber++,
          originalPath,
          processedPath,
          thumbnailPath,
          width: processed.width,
          height: processed.height,
          status: "processed",
        });
      }
    }

    const result: UploadResult = {
      success: true,
      projectId,
      pages: pages.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        originalPath: p.originalPath,
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
