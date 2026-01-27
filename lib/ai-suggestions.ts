/**
 * AI Suggestions Service
 *
 * Analyzes documents for:
 * - Undefined symbols/variables
 * - Suspicious math (likely OCR errors)
 * - Logic gaps and missing steps
 *
 * Uses Groq API (free tier) with Llama for fast inference
 */

import type { DocumentJSON, RegionJSON } from "./types";

export interface Suggestion {
  id: string;
  type: "undefined_symbol" | "suspicious_math" | "logic_gap" | "clarification";
  severity: "info" | "warning" | "error";
  pageNumber: number;
  regionId: string;
  message: string;
  suggestion?: string;
  context?: string;
}

export interface AnalysisResult {
  suggestions: Suggestion[];
  summary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Analyze a document for potential issues
 */
export async function analyzeDocument(
  document: DocumentJSON,
  apiKey?: string
): Promise<AnalysisResult> {
  const suggestions: Suggestion[] = [];

  // Run heuristic checks first (no API needed)
  const heuristicSuggestions = runHeuristicChecks(document);
  suggestions.push(...heuristicSuggestions);

  // If API key provided, run LLM analysis
  if (apiKey) {
    try {
      const llmSuggestions = await runLLMAnalysis(document, apiKey);
      suggestions.push(...llmSuggestions);
    } catch (error) {
      console.error("LLM analysis failed:", error);
      // Continue with heuristic suggestions only
    }
  }

  // Calculate summary
  const summary = {
    total: suggestions.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };

  for (const s of suggestions) {
    summary.byType[s.type] = (summary.byType[s.type] || 0) + 1;
    summary.bySeverity[s.severity] = (summary.bySeverity[s.severity] || 0) + 1;
  }

  return { suggestions, summary };
}

/**
 * Run heuristic checks without LLM
 */
function runHeuristicChecks(document: DocumentJSON): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const definedSymbols = new Set<string>();
  const usedSymbols = new Map<string, { pageNumber: number; regionId: string }>();

  // Collect all symbols
  for (const page of document.pages) {
    for (const region of page.regions) {
      if (region.type === "math" && region.content.latex) {
        // Find defined variables (x = ..., let x, where x)
        const definitions = region.content.latex.match(
          /([a-zA-Z])\s*=|let\s+([a-zA-Z])|where\s+([a-zA-Z])/gi
        );
        if (definitions) {
          for (const match of definitions) {
            const symbol = match.replace(/[=\s]|let|where/gi, "").trim();
            if (symbol) definedSymbols.add(symbol.toLowerCase());
          }
        }

        // Find used variables (single letters)
        const variables = region.content.latex.match(/\b[a-zA-Z]\b/g);
        if (variables) {
          for (const v of variables) {
            if (!usedSymbols.has(v.toLowerCase())) {
              usedSymbols.set(v.toLowerCase(), {
                pageNumber: page.pageNumber,
                regionId: region.id,
              });
            }
          }
        }

        // Check for suspicious patterns
        const latex = region.content.latex;

        // Unmatched parentheses
        const openParens = (latex.match(/\(/g) || []).length;
        const closeParens = (latex.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          suggestions.push({
            id: `heuristic-${region.id}-parens`,
            type: "suspicious_math",
            severity: "warning",
            pageNumber: page.pageNumber,
            regionId: region.id,
            message: "Unmatched parentheses detected",
            context: latex.substring(0, 50),
          });
        }

        // Suspicious double operators
        if (/[+\-*/]{2,}/.test(latex)) {
          suggestions.push({
            id: `heuristic-${region.id}-operators`,
            type: "suspicious_math",
            severity: "warning",
            pageNumber: page.pageNumber,
            regionId: region.id,
            message: "Possible OCR error: consecutive operators",
            context: latex.substring(0, 50),
          });
        }

        // Empty fractions
        if (/\\frac\s*\{\s*\}/.test(latex)) {
          suggestions.push({
            id: `heuristic-${region.id}-frac`,
            type: "suspicious_math",
            severity: "error",
            pageNumber: page.pageNumber,
            regionId: region.id,
            message: "Empty fraction detected",
            context: latex.substring(0, 50),
          });
        }
      }

      // Check text regions for logic indicators without follow-up
      if (region.type === "text" && region.content.text) {
        const text = region.content.text.toLowerCase();

        if (
          text.includes("therefore") ||
          text.includes("thus") ||
          text.includes("hence")
        ) {
          // Check if there's supporting content before
          const regionIndex = page.regions.findIndex((r) => r.id === region.id);
          if (regionIndex === 0) {
            suggestions.push({
              id: `heuristic-${region.id}-logic`,
              type: "logic_gap",
              severity: "info",
              pageNumber: page.pageNumber,
              regionId: region.id,
              message: "Conclusion without visible premise",
              suggestion: "Consider adding the reasoning that leads to this conclusion",
            });
          }
        }
      }
    }
  }

  // Check for undefined symbols (used but not defined)
  // Common math constants to ignore
  const mathConstants = new Set([
    "e",
    "i",
    "n",
    "m",
    "x",
    "y",
    "z",
    "t",
    "a",
    "b",
    "c",
    "d",
    "f",
    "g",
    "h",
    "k",
    "p",
    "q",
    "r",
    "s",
  ]);

  for (const [symbol, location] of usedSymbols.entries()) {
    if (!definedSymbols.has(symbol) && !mathConstants.has(symbol)) {
      suggestions.push({
        id: `heuristic-undefined-${symbol}`,
        type: "undefined_symbol",
        severity: "info",
        pageNumber: location.pageNumber,
        regionId: location.regionId,
        message: `Symbol '${symbol}' used without definition`,
        suggestion: `Consider defining '${symbol}' before first use`,
      });
    }
  }

  return suggestions;
}

/**
 * Run LLM-based analysis using Groq
 */
async function runLLMAnalysis(
  document: DocumentJSON,
  apiKey: string
): Promise<Suggestion[]> {
  // Build context from document
  const documentText = buildDocumentContext(document);

  const systemPrompt = `You are a technical document reviewer. Analyze the following document content and identify:
1. Undefined symbols or variables
2. Suspicious math that might be OCR errors
3. Logic gaps or missing steps
4. Areas that need clarification

Return your analysis as a JSON array of suggestions with this structure:
{
  "suggestions": [
    {
      "type": "undefined_symbol" | "suspicious_math" | "logic_gap" | "clarification",
      "severity": "info" | "warning" | "error",
      "message": "Brief description of the issue",
      "suggestion": "How to fix it (optional)",
      "context": "Relevant snippet from the document"
    }
  ]
}

Only return valid JSON. Be specific and actionable.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: documentText },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return [];
  }

  try {
    // Parse JSON response
    const parsed = JSON.parse(content);
    return (parsed.suggestions || []).map(
      (s: Partial<Suggestion>, i: number) => ({
        id: `llm-${i}`,
        type: s.type || "clarification",
        severity: s.severity || "info",
        pageNumber: 1, // LLM doesn't know page numbers
        regionId: "",
        message: s.message || "",
        suggestion: s.suggestion,
        context: s.context,
      })
    );
  } catch {
    // If JSON parsing fails, return empty
    return [];
  }
}

/**
 * Build text context from document for LLM
 */
function buildDocumentContext(document: DocumentJSON): string {
  const parts: string[] = [];

  for (const page of document.pages) {
    parts.push(`\n--- Page ${page.pageNumber} ---\n`);

    const sortedRegions = [...page.regions].sort(
      (a, b) => a.readingOrder - b.readingOrder
    );

    for (const region of sortedRegions) {
      if (region.type === "text" && region.content.text) {
        parts.push(region.content.text);
      } else if (region.type === "math" && region.content.latex) {
        parts.push(`[MATH: ${region.content.latex}]`);
      } else if (region.type === "figure") {
        parts.push("[FIGURE]");
      }
    }
  }

  return parts.join("\n").substring(0, 4000); // Limit context size
}
