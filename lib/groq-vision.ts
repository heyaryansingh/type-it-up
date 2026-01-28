/**
 * Groq Vision Service - Uses Llama Vision model for OCR
 * Processes images of handwritten notes and extracts text + math + diagrams
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
  type: "text" | "math" | "heading" | "diagram" | "figure";
  content: string;
  confidence?: number;
  diagramType?: string;
  description?: string;
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
    const systemPrompt = `You are an expert OCR and document analysis system that extracts content from handwritten notes, mathematical content, and diagrams.

Analyze the image carefully and extract ALL visible content including:
- Regular text (preserve exact spacing, line breaks, and formatting)
- Mathematical equations and formulas (convert to LaTeX)
- Diagrams, graphs, charts, Venn diagrams, flowcharts
- Figures and drawings that cannot be converted to text/LaTeX

CRITICAL RULES FOR TEXT:
1. PRESERVE ALL SPACES between words exactly as written
2. PRESERVE line breaks and paragraph structure
3. Keep punctuation and capitalization as written
4. Do NOT merge words together - each word must be separate

CRITICAL RULES FOR MATH:
1. Use proper LaTeX syntax for ALL math
2. Fractions: \\frac{numerator}{denominator}
3. Integrals: \\int_{lower}^{upper} f(x) \\, dx
4. Summations: \\sum_{i=0}^{n}
5. Greek letters: \\alpha, \\beta, \\gamma, \\pi, \\theta, etc.
6. Subscripts: x_1 or x_{12}
7. Superscripts: x^2 or x^{2n}
8. Square roots: \\sqrt{x} or \\sqrt[n]{x}
9. Limits: \\lim_{x \\to \\infty}
10. Matrices: \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}

CRITICAL RULES FOR DIAGRAMS:
1. If you see a graph (x-y plot, function graph), identify it as type "diagram" with diagramType "graph"
2. If you see a Venn diagram, identify it as type "diagram" with diagramType "venn"
3. If you see a flowchart, identify it as type "diagram" with diagramType "flowchart"
4. If you see a geometric figure, identify it as type "diagram" with diagramType "geometry"
5. If you see a circuit diagram, identify it as type "diagram" with diagramType "circuit"
6. If the diagram cannot be described mathematically, use type "figure"
7. For diagrams, provide a detailed description in the "description" field

Return your response as valid JSON with this exact structure:
{
  "regions": [
    {
      "type": "text",
      "content": "The extracted text with proper spacing",
      "confidence": 0.95
    },
    {
      "type": "math",
      "content": "\\\\frac{d}{dx}[x^n] = nx^{n-1}",
      "confidence": 0.9
    },
    {
      "type": "heading",
      "content": "Section Title",
      "confidence": 0.95
    },
    {
      "type": "diagram",
      "diagramType": "graph",
      "content": "y = x^2, parabola opening upward, vertex at origin",
      "description": "A parabola representing y=x^2 with vertex at (0,0), passing through points (-2,4), (-1,1), (1,1), (2,4)",
      "confidence": 0.85
    },
    {
      "type": "figure",
      "content": "Complex hand-drawn illustration",
      "description": "Detailed description of what the figure shows",
      "confidence": 0.7
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON, no other text before or after
- Extract content in reading order (top to bottom, left to right)
- Be thorough - extract EVERYTHING visible
- For any text, ensure words are properly separated with spaces`;

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
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      // If no JSON found, treat entire content as text
      parsed = {
        regions: [{ type: "text", content: content, confidence: 0.7 }],
      };
    }
  } catch {
    // If JSON parsing fails, treat as plain text
    parsed = {
      regions: [{ type: "text", content: content, confidence: 0.7 }],
    };
  }

  const regions: RegionJSON[] = (parsed.regions || []).map((r, index) => {
    // Determine region type
    let regionType: "text" | "math" | "figure" | "table" = "text";
    if (r.type === "math") {
      regionType = "math";
    } else if (r.type === "diagram" || r.type === "figure") {
      regionType = "figure";
    }

    const isHeading = r.type === "heading";
    const isDiagram = r.type === "diagram";
    const isFigure = r.type === "figure";

    // Build content object
    let contentObj: RegionJSON["content"];

    if (regionType === "math") {
      contentObj = { latex: r.content };
    } else if (regionType === "figure") {
      // For diagrams and figures, include description and type info
      const figureText = isDiagram
        ? `[DIAGRAM: ${r.diagramType || "unknown"}]\n${r.description || r.content}`
        : `[FIGURE]\n${r.description || r.content}`;

      contentObj = {
        text: figureText,
        // Store the original image for figures that can't be converted
        imagePath: isFigure || (isDiagram && !canConvertDiagram(r.diagramType))
          ? `data:${mimeType};base64,${imageBase64}`
          : undefined,
      };
    } else {
      // Text content - preserve formatting
      const text = isHeading ? `# ${r.content}` : r.content;
      contentObj = { text };
    }

    return {
      id: `region-${projectId}-1-${index + 1}`,
      type: regionType,
      bbox: {
        x: 5,
        y: 5 + index * 12,
        width: 90,
        height: 10,
      },
      confidence: r.confidence || 0.85,
      readingOrder: index,
      content: contentObj,
      // Store diagram metadata for later rendering
      ...(isDiagram && {
        diagramType: r.diagramType,
        diagramDescription: r.description,
      }),
    } as RegionJSON;
  });

  return {
    projectId,
    title: filename.replace(/\.[^.]+$/, ""),
    pages: [
      {
        pageNumber: 1,
        width: 800,
        height: 1000,
        regions,
      },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      totalPages: 1,
      originalImage: `data:${mimeType};base64,${imageBase64}`,
    },
  };
}

/**
 * Check if a diagram type can be converted to LaTeX/code
 */
function canConvertDiagram(diagramType?: string): boolean {
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
