/**
 * LaTeX Renderer - Converts canonical JSON to compilable LaTeX
 * Supports standard math, physics/quantum mechanics, and engineering notation
 */

import type { DocumentJSON, RegionJSON } from "./types";

export interface LaTeXOptions {
  documentClass?: string;
  packages?: string[];
  title?: string;
  author?: string;
  date?: string;
  includeTableOfContents?: boolean;
  notationStyle?: "standard" | "physics" | "engineering";
  includeImages?: boolean;
}

const STANDARD_PACKAGES = [
  "amsmath",
  "amssymb",
  "graphicx",
  "hyperref",
  "geometry",
  "inputenc",
  "fontenc",
  "parskip",
  "xcolor",
  "pgfplots",
  "booktabs",
  "caption",
  "enumitem",
  "parskip",
  "xcolor",
  "pgfplots",
  "booktabs",
  "caption",
  "enumitem",
  "tcolorbox", // High-fidelity highlights
  "adjustbox", // Precise image scaling
];

const PHYSICS_PACKAGES = [
  "amsmath",
  "amssymb",
  "physics",
  "braket",
  "graphicx",
  "hyperref",
  "geometry",
  "inputenc",
];

const ENGINEERING_PACKAGES = [
  "amsmath",
  "amssymb",
  "graphicx",
  "circuitikz",
  "siunitx",
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
    title,
    author,
    date,
    includeTableOfContents = false,
    notationStyle = "standard",
    includeImages = true,
  } = options;

  // Select packages based on notation style
  const packages = options.packages || getPackagesForStyle(notationStyle);

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
    } else if (pkg === "fontenc") {
      lines.push("\\usepackage[T1]{fontenc}");
    } else if (pkg === "pgfplots") {
      lines.push("\\usepackage{pgfplots}");
      lines.push("\\pgfplotsset{compat=1.18}");
    } else {
      lines.push(`\\usepackage{${pkg}}`);
    }
  }

  lines.push("");
  lines.push("% Publishable Quality Enhancement");
  lines.push("\\usepackage{microtype} % Advanced typesetting");
  lines.push("\\usepackage{setspace} % Line spacing control");
  lines.push("\\onehalfspacing % Readability boost");
  lines.push("\\usepackage{mathptmx} % Times font for academic look");
  lines.push("\\setlength{\\parindent}{0pt}");
  lines.push("\\setlength{\\parskip}{1.2em}");
  lines.push("");

  // Automatic TikZ library detection
  const fullContent = document.pages.flatMap(p => p.regions).map(r => r.content.text || r.content.latex || "").join(" ");
  if (fullContent.includes("tikzpicture") || fullContent.includes("circuitikz")) {
    const libraries = ["positioning", "shapes", "arrows.meta", "calc"];
    lines.push(`\\usetikzlibrary{${libraries.join(", ")}}`);
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
  if (!document.pages) return lines.join("\n");

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
      lines.push(renderRegion(region, includeImages));
    }
  }

  // End document
  lines.push("");
  lines.push("\\end{document}");

  return lines.join("\n");
}

/**
 * Get the appropriate LaTeX packages for a notation style
 */
function getPackagesForStyle(style: string): string[] {
  switch (style) {
    case "physics":
      return PHYSICS_PACKAGES;
    case "engineering":
      return ENGINEERING_PACKAGES;
    default:
      return STANDARD_PACKAGES;
  }
}

/**
 * Render a single region to LaTeX
 */
function renderRegion(region: RegionJSON, includeImages: boolean): string {
  let content = "";
  switch (region.type) {
    case "heading":
      content = renderHeadingRegion(region);
      break;
    case "text":
      content = renderTextRegion(region);
      break;
    case "list":
      content = renderListRegion(region);
      break;
    case "math":
      content = renderMathRegion(region);
      break;
    case "figure":
      content = renderFigureRegion(region, includeImages);
      break;
    case "table":
      content = renderTableRegion(region);
      break;
    default:
      content = `% Unknown region type: ${region.type}\n`;
  }

  return content;
}

function renderHeadingRegion(region: RegionJSON): string {
  const text = region.content.text || "";
  // If it's a main title, use section*; if it looks smaller, use subsection*
  if (text.startsWith("##")) {
    return `\\subsection*{${escapeLatex(text.replace(/^#+\s*/, ""))}}\n`;
  }
  return `\\section*{${escapeLatex(text.replace(/^#+\s*/, ""))}}\n`;
}

function renderListRegion(region: RegionJSON): string {
  const text = region.content.text || "";
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  const listItems = lines.map(l => l.replace(/^[-*]|\d+\.\s*/, "").trim());

  return `\\begin{itemize}[leftmargin=*, noitemsep]\n${listItems.map(item => `  \\item ${escapeLatex(item)}`).join("\n")}\n\\end{itemize}\n`;
}

function renderTextRegion(region: RegionJSON): string {
  const text = region.content.text || "";
  const style = region.style;

  if (!text.trim()) return "";

  // Formatting (Handle inline math preservation)
  let latex = text
    .split(/(\$[^$]+\$)/g)
    .map(part => {
      if (part.startsWith("$") && part.endsWith("$")) return part;
      return escapeLatex(part);
    })
    .join("");

  // Apply style wrappers
  if (style) {
    if (style.fontWeight === "bold") latex = `\\textbf{${latex}}`;
    if (style.italic) latex = `\\textit{${latex}}`;
    if (style.fontSize && style.fontSize > 1.2) {
      latex = `{\\large ${latex}}`;
    }
    if (style.color && style.color.startsWith("#")) {
      const hex = style.color.replace("#", "");
      latex = `\\textcolor[HTML]{${hex}}{${latex}}`;
    }
  }

  // Aggressive Variable Wrapping ($x$, $y$)
  latex = latex.replace(/(^|\s)([xyznmabcv])(\s|$|[.,!?;:])/g, "$1$$$2$$$3");

  return latex + "\n\n";
}

function renderMathRegion(region: RegionJSON): string {
  const latex = String(region.content.latex || "");

  // Block math
  if (latex.includes("\\begin{") || latex.includes("\\\\")) {
    // Already has environment or line breaks - use align
    return `\\begin{align*}\n${latex.trim()}\n\\end{align*}\n`;
  }

  // Simple equation
  return `\\[\n${latex.trim()}\n\\]\n`;
}

function renderFigureRegion(region: RegionJSON, includeImages: boolean): string {
  const hasImage = !!region.content.imagePath;
  const isTikZ = !!region.isTikZ;
  const content = region.content.text || "";
  const description = region.diagramDescription || "Figure";

  // If it's valid TikZ code, render it directly
  if (isTikZ && content.includes("\\begin{tikzpicture}")) {
    return `\n% Diagram generated as TikZ\n\\begin{figure}[htbp]\n\\centering\n${content}\n\\caption{${escapeLatex(description)}}\n\\end{figure}\n`;
  }

  // Non-convertible diagram or figure with image — embed as image
  if (hasImage && includeImages) {
    const caption = (region.content.text || "").startsWith("[DIAGRAM:")
      ? `${region.diagramType || "Diagram"}: ${region.diagramDescription || "Diagram"}`
      : description.replace(/^\[.*?\]\n?/, "").split("\n")[0] || "Figure";

    return `\n% Non-convertible diagram — embedded as snapshot
\\begin{center}
\\adjincludegraphics[max width=\\linewidth, max height=\\textheight]{snapshots/${region.id}.png}
\\captionof{figure}{${escapeLatex(caption)}}
\\end{center}\n`;
  }

  // Diagram description as comment if no image and no TikZ
  if ((region.content.text || "").startsWith("[DIAGRAM:")) {
    return `\n% Diagram (${region.diagramType || "unknown"}): ${description.replace(/^\[.*?\]\n?/, "").split("\n")[0]}\n`;
  }

  // Generic fallback if there's no TikZ and no image but somehow we are in figure region
  return `\n% [Figure: ${escapeLatex(description)}]\n`;
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
