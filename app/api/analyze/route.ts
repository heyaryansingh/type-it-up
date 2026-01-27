import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/ai-suggestions";
import type { DocumentJSON } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { document, groqApiKey } = body as {
      document: DocumentJSON;
      groqApiKey?: string;
    };

    if (!document) {
      return NextResponse.json(
        { success: false, error: "Missing document" },
        { status: 400 }
      );
    }

    // Use provided API key or fall back to environment variable
    const apiKey = groqApiKey || process.env.GROQ_API_KEY;

    const result = await analyzeDocument(document, apiKey);

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      summary: result.summary,
      usedLLM: !!apiKey,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
