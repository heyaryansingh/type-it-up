import { NextRequest, NextResponse } from "next/server";
import { processDocument } from "@/lib/ocr-service";
import { downloadFromBucket, RAW_BUCKET, isStorageConfigured } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long processing

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, pageId, originalPath } = body;

    if (!projectId || !originalPath) {
      return NextResponse.json(
        { success: false, error: "Missing projectId or originalPath" },
        { status: 400 }
      );
    }

    let fileBuffer: Buffer;
    let filename = originalPath.split("/").pop() || "document";

    // Try to get file from storage, or use mock data for testing
    if (isStorageConfigured()) {
      try {
        fileBuffer = await downloadFromBucket({
          bucket: RAW_BUCKET,
          path: originalPath,
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: `Failed to retrieve file: ${error instanceof Error ? error.message : "Unknown"}`,
          },
          { status: 404 }
        );
      }
    } else {
      // Return mock response when storage not configured
      return NextResponse.json({
        success: true,
        document: {
          projectId,
          pages: [
            {
              pageNumber: 1,
              width: 800,
              height: 1000,
              regions: [
                {
                  id: `region-${projectId}-1-1`,
                  type: "text",
                  bbox: { x: 5, y: 5, width: 90, height: 20 },
                  confidence: 0.85,
                  readingOrder: 0,
                  content: {
                    text: "Sample text region (storage not configured for demo)",
                  },
                },
                {
                  id: `region-${projectId}-1-2`,
                  type: "math",
                  bbox: { x: 5, y: 30, width: 90, height: 15 },
                  confidence: 0.9,
                  readingOrder: 1,
                  content: {
                    latex: "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
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
        },
        message: "Demo mode - storage not configured",
      });
    }

    // Create a File object for the ML service
    // Convert Buffer to Uint8Array for File constructor compatibility
    const file = new File([new Uint8Array(fileBuffer)], filename, {
      type: filename.endsWith(".pdf") ? "application/pdf" : "image/png",
    });

    // Process through ML service
    const result = await processDocument(file, filename, projectId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: result.document,
      rawMarkdown: result.rawMarkdown,
    });
  } catch (error) {
    console.error("Process error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Processing failed",
      },
      { status: 500 }
    );
  }
}
