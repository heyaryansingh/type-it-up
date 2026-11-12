import { NextRequest, NextResponse } from "next/server";
import { exportDocument } from "@/lib/export-service";
import { sanitizeFilename } from "@/lib/input-validator";
import type { DocumentJSON } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const { document, format, title, author } = body as {
      document: DocumentJSON;
      format: "latex" | "markdown" | "overleaf" | "all";
      title?: string;
      author?: string;
    };

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Missing document" },
        { status: 400 }
      );
    }

    if (!format) {
      return NextResponse.json(
        { success: false, error: "Missing format" },
        { status: 400 }
      );
    }

    if (!Array.isArray(document.pages)) {
      return NextResponse.json(
        { success: false, error: "document.pages must be an array" },
        { status: 400 }
      );
    }

    if (!["latex", "markdown", "overleaf", "all"].includes(format)) {
      return NextResponse.json(
        { success: false, error: "Invalid format" },
        { status: 400 }
      );
    }

    if (
      (title !== undefined && typeof title !== "string") ||
      (author !== undefined && typeof author !== "string")
    ) {
      return NextResponse.json(
        { success: false, error: "title and author must be strings" },
        { status: 400 }
      );
    }

    // The title reaches us straight from the request body and is
    // interpolated into Content-Disposition, so a quote or newline in it
    // would break the header apart. Reuse the storage sanitizer, and fall
    // back again when it strips the title down to nothing.
    const safeTitle = sanitizeFilename(title || "document") || "document";

    // For now, use empty figures map (figures would come from storage)
    const figures = new Map<string, Blob>();

    const result = await exportDocument(document, figures, {
      format,
      title,
      author,
    });

    // Return appropriate content type based on format
    if (format === "latex") {
      return new NextResponse(result.latex, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeTitle}.tex"`,
        },
      });
    }

    if (format === "markdown") {
      return new NextResponse(result.markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
        },
      });
    }

    if (format === "overleaf" && result.overleafZip) {
      return new NextResponse(result.overleafZip, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${safeTitle}-overleaf.zip"`,
        },
      });
    }

    // Return JSON for 'all' format or when specific format not available
    return NextResponse.json({
      success: true,
      latex: result.latex,
      markdown: result.markdown,
      hasZip: !!result.overleafZip,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}
