import { NextRequest, NextResponse } from "next/server";
import { processImageWithVision, isGroqConfigured } from "@/lib/groq-vision";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for vision processing

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let imageBase64: string;
    let mimeType: string;
    let filename: string;
    let projectId: string;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload directly
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      projectId = (formData.get("projectId") as string) || crypto.randomUUID();

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString("base64");
      mimeType = file.type || "image/png";
      filename = file.name;
    } else {
      // Handle JSON with base64 image
      const body = await request.json();
      imageBase64 = body.imageBase64;
      mimeType = body.mimeType || "image/png";
      filename = body.filename || "document.png";
      projectId = body.projectId || crypto.randomUUID();

      if (!imageBase64) {
        return NextResponse.json(
          { success: false, error: "No image data provided" },
          { status: 400 }
        );
      }
    }

    // Check if Groq is configured
    if (!isGroqConfigured()) {
      // Return demo response
      return NextResponse.json({
        success: true,
        document: createDemoDocument(projectId, filename),
        message: "Demo mode - configure GROQ_API_KEY for real OCR",
      });
    }

    // Process with Groq Vision
    const result = await processImageWithVision(
      imageBase64,
      mimeType,
      projectId,
      filename
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document: result.document,
      rawText: result.rawText,
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

function createDemoDocument(projectId: string, filename: string) {
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
            content: { text: "# Demo Mode" },
          },
          {
            id: `region-${projectId}-1-2`,
            type: "text",
            bbox: { x: 5, y: 18, width: 90, height: 10 },
            confidence: 0.85,
            readingOrder: 1,
            content: {
              text: "Configure GROQ_API_KEY in .env.local for real OCR processing.",
            },
          },
          {
            id: `region-${projectId}-1-3`,
            type: "math",
            bbox: { x: 10, y: 32, width: 80, height: 12 },
            confidence: 0.9,
            readingOrder: 2,
            content: {
              latex: "E = mc^2",
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
