import { NextRequest, NextResponse } from "next/server";
import { exportDocument } from "@/lib/export-service";
import type { DocumentJSON } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
          "Content-Disposition": `attachment; filename="${title || "document"}.tex"`,
        },
      });
    }

    if (format === "markdown") {
      return new NextResponse(result.markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${title || "document"}.md"`,
        },
      });
    }

    if (format === "overleaf" && result.overleafZip) {
      return new NextResponse(result.overleafZip, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${title || "document"}-overleaf.zip"`,
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
