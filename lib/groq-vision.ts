/**
 * Groq Vision Service - Uses Llama Vision model for OCR
 * Processes images of handwritten notes and extracts text + math + diagrams
 * Enhanced for quantum mechanics notation and advanced math
 */

import type { DocumentJSON, RegionJSON } from "./types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface VisionResult {
  success: boolean;
  document?: DocumentJSON;
  rawText?: string;
  error?: string;
}

interface ParsedRegion {
  type: "text" | "math" | "heading" | "list" | "diagram" | "figure";
  content: string;
  confidence?: number;
  diagramType?: string;
  description?: string;
  isTikZ?: boolean;
  bbox?: { x: number; y: number; width: number; height: number };
  style?: {
    color?: string;
    backgroundColor?: string;
    fontWeight?: "normal" | "bold";
    fontSize?: number;
    italic?: boolean;
    underline?: boolean;
  };
}

/**
 * Process an image using Groq Vision API
 */
export async function processImageWithVision(
  imageBase64: string,
  mimeType: string,
  projectId: string,
  filename: string
): Promise<VisionResult> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "GROQ_API_KEY not configured",
    };
  }

  try {
    const systemPrompt = `You are a high-fidelity document reconstruction engine. Your goal is to map handwritten or printed documents to a digital layout with SURGICAL PRECISION. 

Analyze the image and extract ALL content. You must maintain the exact physical layout of the page.

DOCUMENT STRUCTURE & SEQUENTIAL FLOW:
- Extract content in the EXACT reading order as a sequence of semantic regions.
- **NO COORDINATES**: Do not return bounding boxes (bbox) for text or math.
- **FIGURE EXCEPTION**: Return a bounding box ONLY for \`type: "figure"\` to allow high-fidelity cropping.
- **ALIGNMENT**: Use standard document flow (top-to-bottom).

CONTENT CLASSIFICATION:
- \`type: "heading"\`: For titles or section headers (e.g., "# Title").
- \`type: "text"\`: For narrative paragraphs.
- \`type: "math"\`: For equations. If it's a standalone equation, force professional LaTeX (e.g., "\\[ ... \\]"). If it's inline, use "$ ... $".
- \`type: "list"\`: For bulleted or numbered items.
- \`type: "figure"\`: For hand-drawn diagrams (include a description).

FEW-SHOT GUIDE (Semantic Flow):
Region 1: {"type": "heading", "content": "Physics Notes: Kinematics"}
Region 2: {"type": "text", "content": "Average speed is defined as total distance over total time."}
Region 3: {"type": "math", "content": "\\[ v_{avg} = \\frac{d}{t} \\]"}

Return valid JSON with "regions" array containing "type", "content", and "confidence". Only return JSON.`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: systemPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return {
        success: false,
        error: `Groq API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: "No response from vision model",
      };
    }

    // Parse the JSON response
    const document = parseVisionResponse(content, projectId, filename, imageBase64, mimeType);

    return {
      success: true,
      document,
      rawText: content,
    };
  } catch (error) {
    console.error("Vision processing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Vision processing failed",
    };
  }
}

/**
 * Parse the vision model's JSON response into our document format
 */
function parseVisionResponse(
  content: string,
  projectId: string,
  filename: string,
  imageBase64: string,
  mimeType: string
): DocumentJSON {
  let parsed: { regions?: ParsedRegion[] };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = { regions: [{ type: "text", content: content, confidence: 0.7 }] };
    }
  } catch {
    parsed = { regions: [{ type: "text", content: content, confidence: 0.7 }] };
  }

  const regions: RegionJSON[] = (parsed.regions || []).map((r, index) => {
    // Map AI types to our canonical types
    let type: RegionJSON["type"] = "text";
    if (r.type === "math") type = "math";
    else if (r.type === "heading") type = "heading";
    else if (r.type === "list") type = "list";
    else if (r.type === "figure" || r.type === "diagram") type = "figure";

    const safeContent = String(r.content || "");
    let contentObj: RegionJSON["content"];

    if (type === "math") {
      contentObj = { latex: safeContent };
    } else if (type === "figure") {
      contentObj = {
        text: `[FIGURE]\n${r.description || safeContent}`,
        imagePath: `data:${mimeType};base64,${imageBase64}`
      };
    } else {
      contentObj = { text: safeContent };
    }

    return {
      id: `region-${projectId}-1-${index + 1}`,
      type,
      confidence: r.confidence || 0.85,
      readingOrder: index,
      content: contentObj,
      style: r.style,
      ...(r.type === "diagram" && {
        diagramType: r.diagramType,
        diagramDescription: r.description,
        isTikZ: r.isTikZ,
      }),
    } as RegionJSON;
  });

  return {
    projectId,
    title: filename.replace(/\.[^.]+$/, ""),
    pages: [{
      pageNumber: 1,
      width: 1000,
      height: 1000,
      regions
    }],
    metadata: {
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      totalPages: 1,
      originalImage: `data:${mimeType};base64,${imageBase64}`,
    },
  };
}


/**
 * Check if a diagram type can be converted to LaTeX/TikZ.
 * Used during document export to determine if a hand-drawn diagram
 * should be vectorized or kept as a raster image.
 *
 * @param diagramType - The type of diagram detected by vision model
 * @returns true if the diagram type supports LaTeX/TikZ conversion
 *
 * @example
 * canConvertDiagram("graph") // returns true
 * canConvertDiagram("photo") // returns false
 */
export function canConvertDiagram(diagramType?: string): boolean {
  const convertibleTypes = ["graph", "venn", "geometry", "flowchart"];
  return diagramType ? convertibleTypes.includes(diagramType) : false;
}

/**
 * Check if Groq Vision is available
 */
export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== "your_groq_api_key_here";
}
