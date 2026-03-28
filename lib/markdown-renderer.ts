/**
 * Markdown Renderer - Converts canonical JSON to Markdown with math blocks
 */

import type { DocumentJSON, RegionJSON } from "./types";

export interface MarkdownOptions {
  title?: string;
  includeYamlFrontmatter?: boolean;
  mathDelimiters?: "dollar" | "brackets";
  imagePathPrefix?: string;
}

/**
 * Convert a document to Markdown
 */
export function renderToMarkdown(
  document: DocumentJSON,
  options: MarkdownOptions = {}
): string {
  const {
    title,
    includeYamlFrontmatter = true,
    mathDelimiters = "dollar",
    imagePathPrefix = "./figures/",
  } = options;

  const lines: string[] = [];

  // Render pages
  if (!document.pages) return lines.join("\n");

  // YAML frontmatter
  if (includeYamlFrontmatter) {
    lines.push("---");
    if (title) {
      lines.push(`title: "${title}"`);
    }
    lines.push(`date: ${new Date().toISOString().split("T")[0]}`);
    lines.push(`pages: ${document.pages.length}`);
    lines.push("---");
    lines.push("");
  }

  // Title
  if (title) {
    lines.push(`# ${title}`);
    lines.push("");
  }

  // Render pages
  for (let i = 0; i < document.pages.length; i++) {
    const page = document.pages[i];

    if (document.pages.length > 1 && i > 0) {
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    // Sort regions by reading order
    const sortedRegions = [...page.regions].sort(
      (a, b) => a.readingOrder - b.readingOrder
    );

    for (const region of sortedRegions) {
      const rendered = renderRegion(region, mathDelimiters, imagePathPrefix);
      if (rendered) {
        lines.push(rendered);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Render a single region to Markdown
 */
function renderRegion(
  region: RegionJSON,
  mathDelimiters: "dollar" | "brackets",
  imagePathPrefix: string
): string {
  switch (region.type) {
    case "text":
      return renderTextRegion(region);
    case "math":
      return renderMathRegion(region, mathDelimiters);
    case "figure":
      return renderFigureRegion(region, imagePathPrefix);
    case "table":
      return renderTableRegion(region);
    default:
      return "";
  }
}

function renderTextRegion(region: RegionJSON): string {
  const text = region.content.text || "";

  // Check if it looks like a heading
  if (text.length < 100 && !text.includes("\n") && region.confidence > 0.9) {
    return `## ${text.trim()}\n`;
  }

  return text.trim() + "\n";
}

function renderMathRegion(
  region: RegionJSON,
  delimiters: "dollar" | "brackets"
): string {
  const latex = String(region.content.latex || "");

  if (delimiters === "dollar") {
    return `$$\n${latex.trim()}\n$$\n`;
  } else {
    return `\\[\n${latex.trim()}\n\\]\n`;
  }
}

function renderFigureRegion(region: RegionJSON, prefix: string): string {
  const imagePath = region.content.imagePath || "figure.png";
  const filename = imagePath.split("/").pop() || "figure";

  return `![Figure](${prefix}${filename})\n`;
}

function renderTableRegion(region: RegionJSON): string {
  const text = region.content.text || "Table content";

  // Try to detect table structure and convert to markdown table
  const lines = text.trim().split("\n");

  if (lines.length > 1) {
    // Assume first line is header
    const header = lines[0].split(/\s{2,}|\t/);
    const separator = header.map(() => "---").join(" | ");

    const tableLines = [
      header.join(" | "),
      separator,
      ...lines.slice(1).map((line) => line.split(/\s{2,}|\t/).join(" | ")),
    ];

    return tableLines.join("\n") + "\n";
  }

  return text + "\n";
}

/**
 * Convert inline math in text to markdown format
 */
export function processInlineMath(
  text: string,
  delimiters: "dollar" | "brackets" = "dollar"
): string {
  // Already using $...$ format, keep as-is for dollar delimiters
  if (delimiters === "dollar") {
    return text;
  }

  // Convert to \(...\) format
  return text.replace(/\$([^$]+)\$/g, "\\($1\\)");
}
