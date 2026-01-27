/**
 * LaTeX Renderer - Converts canonical JSON to compilable LaTeX
 */

import type { DocumentJSON, RegionJSON } from "./types";

export interface LaTeXOptions {
  documentClass?: string;
  packages?: string[];
  title?: string;
  author?: string;
  date?: string;
  includeTableOfContents?: boolean;
}

const DEFAULT_PACKAGES = [
  "amsmath",
  "amssymb",
  "graphicx",
  "hyperref",
  "geometry",
  "inputenc",
];

const LATEX_SPECIAL_CHARS: Record<string, string> = {
  "&": "\\&",
  "%": "\\%",
  "$": "\\$",
  "#": "\\#",
  "_": "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
};

/**
 * Escape special LaTeX characters in plain text
 */
function escapeLatex(text: string): string {
  let result = text;
  for (const [char, escape] of Object.entries(LATEX_SPECIAL_CHARS)) {
    result = result.split(char).join(escape);
  }
  return result;
}

/**
 * Convert a document to LaTeX
 */
export function renderToLatex(
  document: DocumentJSON,
  options: LaTeXOptions = {}
): string {
  const {
    documentClass = "article",
    packages = DEFAULT_PACKAGES,
    title,
    author,
    date,
    includeTableOfContents = false,
  } = options;

  const lines: string[] = [];

  // Document class
  lines.push(`\\documentclass[12pt]{${documentClass}}`);
  lines.push("");

  // Packages
  for (const pkg of packages) {
    if (pkg === "geometry") {
      lines.push("\\usepackage[margin=1in]{geometry}");
    } else if (pkg === "inputenc") {
      lines.push("\\usepackage[utf8]{inputenc}");
    } else {
      lines.push(`\\usepackage{${pkg}}`);
    }
  }
  lines.push("");

  // Title, author, date
  if (title) {
    lines.push(`\\title{${escapeLatex(title)}}`);
  }
  if (author) {
    lines.push(`\\author{${escapeLatex(author)}}`);
  }
  if (date) {
    lines.push(`\\date{${escapeLatex(date)}}`);
  } else {
    lines.push("\\date{\\today}");
  }
  lines.push("");

  // Begin document
  lines.push("\\begin{document}");
  lines.push("");

  if (title) {
    lines.push("\\maketitle");
    lines.push("");
  }

  if (includeTableOfContents) {
    lines.push("\\tableofcontents");
    lines.push("\\newpage");
    lines.push("");
  }

  // Render pages
  for (let i = 0; i < document.pages.length; i++) {
    const page = document.pages[i];

    if (i > 0) {
      lines.push("");
      lines.push("% --- Page " + (i + 1) + " ---");
      lines.push("");
    }

    // Sort regions by reading order
    const sortedRegions = [...page.regions].sort(
      (a, b) => a.readingOrder - b.readingOrder
    );

    for (const region of sortedRegions) {
      lines.push(renderRegion(region));
    }
  }

  // End document
  lines.push("");
  lines.push("\\end{document}");

  return lines.join("\n");
}

/**
 * Render a single region to LaTeX
 */
function renderRegion(region: RegionJSON): string {
  switch (region.type) {
    case "text":
      return renderTextRegion(region);
    case "math":
      return renderMathRegion(region);
    case "figure":
      return renderFigureRegion(region);
    case "table":
      return renderTableRegion(region);
    default:
      return `% Unknown region type: ${region.type}`;
  }
}

function renderTextRegion(region: RegionJSON): string {
  const text = region.content.text || "";

  // Check if it looks like a heading
  if (text.length < 100 && !text.includes("\n")) {
    // Could be a section title - check confidence
    if (region.confidence > 0.9) {
      return `\\section*{${escapeLatex(text.trim())}}`;
    }
  }

  // Handle inline math within text
  let processedText = text;

  // Convert $...$ inline math (don't escape the math content)
  processedText = processedText.replace(
    /\$([^$]+)\$/g,
    (_, math) => `$${math}$`
  );

  // Escape non-math text
  const parts = processedText.split(/(\$[^$]+\$)/g);
  const escapedParts = parts.map((part) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      return part; // Keep math as-is
    }
    return escapeLatex(part);
  });

  return escapedParts.join("") + "\n";
}

function renderMathRegion(region: RegionJSON): string {
  const latex = region.content.latex || "";

  // Block math
  if (latex.includes("\\begin{") || latex.includes("\\\\")) {
    // Already has environment or line breaks - use align
    return `\\begin{align*}\n${latex.trim()}\n\\end{align*}\n`;
  }

  // Simple equation
  return `\\[\n${latex.trim()}\n\\]\n`;
}

function renderFigureRegion(region: RegionJSON): string {
  const imagePath = region.content.imagePath || "figure.png";
  const filename = imagePath.split("/").pop() || "figure";

  return `\\begin{figure}[htbp]
\\centering
\\includegraphics[width=0.8\\textwidth]{figures/${filename}}
\\caption{Figure}
\\label{fig:${filename.replace(/\.[^.]+$/, "")}}
\\end{figure}
`;
}

function renderTableRegion(region: RegionJSON): string {
  // Tables would need more complex parsing
  // For now, render as text
  const text = region.content.text || "Table content";
  return `\\begin{table}[htbp]
\\centering
\\begin{tabular}{c}
${escapeLatex(text)}
\\end{tabular}
\\caption{Table}
\\end{table}
`;
}

/**
 * Validate LaTeX for common issues
 */
export function validateLatex(latex: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unmatched braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (braceCount < 0) {
      errors.push("Unmatched closing brace found");
      break;
    }
  }
  if (braceCount > 0) {
    errors.push(`${braceCount} unclosed brace(s)`);
  }

  // Check for unmatched begin/end
  const beginMatches = latex.match(/\\begin\{([^}]+)\}/g) || [];
  const endMatches = latex.match(/\\end\{([^}]+)\}/g) || [];

  if (beginMatches.length !== endMatches.length) {
    errors.push("Mismatched \\begin and \\end environments");
  }

  // Check for common issues
  if (latex.includes("\\left") && !latex.includes("\\right")) {
    errors.push("\\left without matching \\right");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
