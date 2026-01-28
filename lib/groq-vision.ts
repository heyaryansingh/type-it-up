/**
 * Groq Vision Service - Uses Llama Vision model for OCR
 * Processes images of handwritten notes and extracts text + math
 */

import type { DocumentJSON, RegionJSON } from "./types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface VisionResult {
  success: boolean;
  document?: DocumentJSON;
  rawText?: string;
  error?: string;
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
    const systemPrompt = `You are an expert OCR system that extracts content from handwritten notes, especially mathematical content.

Analyze the image and extract ALL text and mathematical content.

IMPORTANT: Return your response as valid JSON with this exact structure:
{
  "regions": [
    {
      "type": "text" | "math" | "heading",
      "content": "the extracted text or LaTeX",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
1. For regular text, use type "text" and put the text in "content"
2. For mathematical expressions, equations, or formulas, use type "math" and put valid LaTeX in "content"
3. For section headers/titles, use type "heading"
4. Convert ALL math to proper LaTeX notation:
   - Fractions: \\frac{num}{denom}
   - Integrals: \\int_{lower}^{upper}
   - Summations: \\sum_{i=0}^{n}
   - Greek letters: \\alpha, \\beta, \\pi, etc.
   - Subscripts: x_1, x_{12}
   - Superscripts: x^2, x^{2n}
5. Maintain reading order from top to bottom, left to right
6. Be thorough - extract EVERYTHING visible

Return ONLY the JSON, no other text.`;

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
        max_tokens: 4000,
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
    const document = parseVisionResponse(content, projectId, filename);

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
  filename: string
): DocumentJSON {
  let parsed: { regions?: Array<{ type: string; content: string; confidence?: number }> };

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
    const regionType = r.type === "math" ? "math" : r.type === "heading" ? "text" : "text";
    const isHeading = r.type === "heading";

    return {
      id: `region-${projectId}-1-${index + 1}`,
      type: regionType as "text" | "math" | "figure" | "table",
      bbox: {
        x: 5,
        y: 5 + index * 12,
        width: 90,
        height: 10,
      },
      confidence: r.confidence || 0.85,
      readingOrder: index,
      content:
        regionType === "math"
          ? { latex: r.content }
          : { text: isHeading ? `# ${r.content}` : r.content },
    };
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
    },
  };
}

/**
 * Check if Groq Vision is available
 */
export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return !!key && key !== "your_groq_api_key_here";
}
