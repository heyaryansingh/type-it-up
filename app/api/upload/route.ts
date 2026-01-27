import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { preprocessImage, generateThumbnail, getImageDimensions } from "@/lib/preprocessing";
import { getPDFInfo, isPDF, getImageType } from "@/lib/pdf-utils";
import { uploadToBucket, RAW_BUCKET, PAGES_BUCKET, isStorageConfigured } from "@/lib/storage";
import type { UploadResult, Page } from "@/lib/types";

export const runtime = "nodejs";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
    const projectName = formData.get("projectName") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} exceeds 50MB limit` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} has unsupported type: ${file.type}` },
          { status: 400 }
        );
      }
    }

    const projectId = uuidv4();
    const pages: Page[] = [];
    let pageNumber = 1;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

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
          continue; // Skip unknown file types
        }

        const pageId = uuidv4();
        const originalPath = `${projectId}/original/${pageId}.${imageType}`;

        // Get original dimensions
        const dimensions = await getImageDimensions(buffer);

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
