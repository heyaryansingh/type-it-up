import { NextResponse } from "next/server";
import { isGroqConfigured } from "@/lib/groq-vision";

/**
 * Test endpoint to verify system configuration and AI model availability
 */
export async function GET() {
  const tests = {
    timestamp: new Date().toISOString(),
    groqConfigured: isGroqConfigured(),
    environment: {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    },
    demoDocument: createStressTestDocument(),
  };

  return NextResponse.json(tests);
}

/**
 * Create a stress test document with mixed content types
 * This tests the positioning and rendering of various content types
 */
function createStressTestDocument() {
  const projectId = "stress-test";

  return {
    projectId,
    title: "Stress Test Document",
    pages: [
      {
        pageNumber: 1,
        width: 800,
        height: 1200,
        regions: [
          // Heading
          {
            id: `region-${projectId}-1-1`,
            type: "text",
            bbox: { x: 5, y: 5, width: 90, height: 8 },
            confidence: 0.95,
            readingOrder: 0,
            content: { text: "# Introduction to Calculus" },
          },
          // Regular text paragraph
          {
            id: `region-${projectId}-1-2`,
            type: "text",
            bbox: { x: 5, y: 15, width: 90, height: 10 },
            confidence: 0.92,
            readingOrder: 1,
            content: {
              text: "Calculus is a branch of mathematics that deals with continuous change. It provides tools for analyzing functions, rates of change, and accumulation of quantities.",
            },
          },
          // Math equation - derivative
          {
            id: `region-${projectId}-1-3`,
            type: "math",
            bbox: { x: 10, y: 28, width: 80, height: 8 },
            confidence: 0.89,
            readingOrder: 2,
            content: {
              latex: "\\frac{d}{dx}[x^n] = nx^{n-1}",
            },
          },
          // Text after equation
          {
            id: `region-${projectId}-1-4`,
            type: "text",
            bbox: { x: 5, y: 38, width: 90, height: 8 },
            confidence: 0.91,
            readingOrder: 3,
            content: {
              text: "The power rule is one of the most fundamental rules in differential calculus.",
            },
          },
          // Another heading
          {
            id: `region-${projectId}-1-5`,
            type: "text",
            bbox: { x: 5, y: 50, width: 90, height: 8 },
            confidence: 0.94,
            readingOrder: 4,
            content: { text: "# Integration" },
          },
          // Complex math - integral
          {
            id: `region-${projectId}-1-6`,
            type: "math",
            bbox: { x: 10, y: 60, width: 80, height: 10 },
            confidence: 0.87,
            readingOrder: 5,
            content: {
              latex: "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
            },
          },
          // Text paragraph
          {
            id: `region-${projectId}-1-7`,
            type: "text",
            bbox: { x: 5, y: 72, width: 90, height: 8 },
            confidence: 0.90,
            readingOrder: 6,
            content: {
              text: "The Gaussian integral is a fundamental result in probability theory and statistics.",
            },
          },
          // Matrix equation
          {
            id: `region-${projectId}-1-8`,
            type: "math",
            bbox: { x: 10, y: 82, width: 80, height: 12 },
            confidence: 0.85,
            readingOrder: 7,
            content: {
              latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}",
            },
          },
          // Figure placeholder
          {
            id: `region-${projectId}-1-9`,
            type: "figure",
            bbox: { x: 15, y: 96, width: 70, height: 20 },
            confidence: 0.80,
            readingOrder: 8,
            content: {
              text: "[DIAGRAM: graph]\nParabola y = x² showing vertex at origin",
            },
            diagramType: "graph",
            diagramDescription: "A parabola representing y=x² with vertex at (0,0)",
          },
          // Summation
          {
            id: `region-${projectId}-1-10`,
            type: "math",
            bbox: { x: 10, y: 118, width: 80, height: 10 },
            confidence: 0.88,
            readingOrder: 9,
            content: {
              latex: "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}",
            },
          },
          // Final text
          {
            id: `region-${projectId}-1-11`,
            type: "text",
            bbox: { x: 5, y: 130, width: 90, height: 8 },
            confidence: 0.93,
            readingOrder: 10,
            content: {
              text: "The Basel problem, solved by Euler in 1734, demonstrates the deep connection between infinite series and fundamental constants.",
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
