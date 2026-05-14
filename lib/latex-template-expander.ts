/**
 * @fileoverview LaTeX Template Expander - Quick document scaffolding
 * @module lib/latex-template-expander
 *
 * Provides intelligent LaTeX document expansion from minimal input.
 * Automatically adds proper preambles, packages, and structure based
 * on document type detection.
 *
 * @example
 * ```typescript
 * import { expandLatexTemplate, detectDocumentType } from './latex-template-expander';
 *
 * const minimal = "\\section{Introduction}\nSome text with $e^{i\\pi}$";
 * const docType = detectDocumentType(minimal);
 * const expanded = expandLatexTemplate(minimal, docType);
 * ```
 */

export type DocumentType =
  | "article"
  | "beamer"
  | "homework"
  | "resume"
  | "letter"
  | "thesis"
  | "notes"
  | "exam"
  | "generic";

export interface TemplateConfig {
  documentClass: string;
  packages: string[];
  customCommands: string[];
  geometry?: string;
  title?: string;
  author?: string;
  date?: string;
}

/**
 * Detect document type from LaTeX content using heuristics
 */
export function detectDocumentType(content: string): DocumentType {
  const lower = content.toLowerCase();

  // Check for beamer-specific commands
  if (lower.includes("\\frame") || lower.includes("\\begin{frame}")) {
    return "beamer";
  }

  // Check for resume indicators
  if (
    lower.includes("\\resumeentry") ||
    lower.includes("\\cventry") ||
    (lower.includes("\\section{experience}") && lower.includes("\\section{education}"))
  ) {
    return "resume";
  }

  // Check for letter format
  if (lower.includes("\\opening") || lower.includes("\\closing") || lower.includes("\\letter")) {
    return "letter";
  }

  // Check for homework/assignment indicators
  if (
    lower.includes("\\problem") ||
    lower.includes("\\solution") ||
    lower.includes("\\question") ||
    /homework|assignment|exercise/i.test(content)
  ) {
    return "homework";
  }

  // Check for exam indicators
  if (lower.includes("\\begin{questions}") || lower.includes("\\begin{parts}") || /exam|quiz|test/i.test(content)) {
    return "exam";
  }

  // Check for thesis/dissertation
  if (lower.includes("\\chapter") || /thesis|dissertation/i.test(content)) {
    return "thesis";
  }

  // Check for notes/lecture notes
  if (
    lower.includes("\\lecture") ||
    lower.includes("\\notes") ||
    /lecture notes|class notes/i.test(content)
  ) {
    return "notes";
  }

  // Default to article if sections found, otherwise generic
  if (lower.includes("\\section") || lower.includes("\\subsection")) {
    return "article";
  }

  return "generic";
}

/**
 * Detect required packages from LaTeX content
 */
export function detectRequiredPackages(content: string): string[] {
  const packages: Set<string> = new Set(["inputenc", "fontenc", "lmodern"]);

  // Math packages
  if (/\$.*\$|\\\[.*\\\]|\\begin\{equation|\\begin\{align/s.test(content)) {
    packages.add("amsmath");
    packages.add("amssymb");
    packages.add("amsfonts");
  }

  // Graphics
  if (/\\includegraphics|\\begin\{figure\}/i.test(content)) {
    packages.add("graphicx");
  }

  // Colors
  if (/\\textcolor|\\color|\\colorbox/i.test(content)) {
    packages.add("xcolor");
  }

  // Hyperlinks
  if (/\\href|\\url/i.test(content)) {
    packages.add("hyperref");
  }

  // Code listings
  if (/\\begin\{lstlisting\}|\\lstinline/i.test(content)) {
    packages.add("listings");
  }

  // Tables
  if (/\\begin\{tabular\}|\\begin\{table\}/i.test(content)) {
    packages.add("booktabs");
  }

  // Diagrams
  if (/\\begin\{tikzpicture\}/i.test(content)) {
    packages.add("tikz");
  }

  // Chemistry
  if (/\\ce\{|\\chemfig/i.test(content)) {
    packages.add("chemfig");
    packages.add("mhchem");
  }

  // Algorithms
  if (/\\begin\{algorithm\}|\\begin\{algorithmic\}/i.test(content)) {
    packages.add("algorithm");
    packages.add("algpseudocode");
  }

  // Bibliography
  if (/\\cite|\\bibliography/i.test(content)) {
    packages.add("natbib");
  }

  return Array.from(packages);
}

/**
 * Generate template configuration for document type
 */
export function getTemplateConfig(docType: DocumentType, content: string): TemplateConfig {
  const packages = detectRequiredPackages(content);

  const configs: Record<DocumentType, TemplateConfig> = {
    article: {
      documentClass: "article",
      packages: [...packages, "geometry"],
      customCommands: [],
      geometry: "margin=1in",
    },
    beamer: {
      documentClass: "beamer",
      packages: [...packages],
      customCommands: ["\\usetheme{Madrid}", "\\usecolortheme{default}"],
    },
    homework: {
      documentClass: "article",
      packages: [...packages, "geometry", "fancyhdr"],
      customCommands: [
        "\\newcommand{\\problem}[1]{\\section*{Problem #1}}",
        "\\newcommand{\\solution}{\\subsection*{Solution}}",
      ],
      geometry: "margin=1in",
    },
    resume: {
      documentClass: "article",
      packages: [...packages, "geometry", "enumitem"],
      customCommands: [
        "\\newcommand{\\resumeentry}[4]{\\textbf{#1} \\hfill #2 \\\\ \\textit{#3} \\hfill #4}",
      ],
      geometry: "margin=0.75in",
    },
    letter: {
      documentClass: "letter",
      packages: [...packages],
      customCommands: [],
    },
    thesis: {
      documentClass: "report",
      packages: [...packages, "geometry", "setspace"],
      customCommands: ["\\doublespacing"],
      geometry: "margin=1in",
    },
    notes: {
      documentClass: "article",
      packages: [...packages, "geometry", "fancyhdr"],
      customCommands: [
        "\\newcommand{\\lecture}[2]{\\section*{Lecture #1: #2}}",
        "\\pagestyle{fancy}",
      ],
      geometry: "margin=1in",
    },
    exam: {
      documentClass: "exam",
      packages: [...packages],
      customCommands: ["\\printanswers  % Comment out to hide answers"],
    },
    generic: {
      documentClass: "article",
      packages: [...packages],
      customCommands: [],
    },
  };

  return configs[docType];
}

/**
 * Check if content already has document class and preamble
 */
export function hasFullPreamble(content: string): boolean {
  const hasDocClass = /\\documentclass/.test(content);
  const hasBeginDoc = /\\begin\{document\}/.test(content);
  const hasEndDoc = /\\end\{document\}/.test(content);

  return hasDocClass && hasBeginDoc && hasEndDoc;
}

/**
 * Expand minimal LaTeX content into full document with proper preamble
 */
export function expandLatexTemplate(
  content: string,
  docType?: DocumentType,
  options: Partial<TemplateConfig> = {}
): string {
  // If already has full preamble, return as-is
  if (hasFullPreamble(content)) {
    return content;
  }

  // Auto-detect document type if not provided
  const detectedType = docType || detectDocumentType(content);
  const config = getTemplateConfig(detectedType, content);

  // Merge with custom options
  const finalConfig: TemplateConfig = {
    ...config,
    ...options,
    packages: [...new Set([...config.packages, ...(options.packages || [])])],
    customCommands: [...config.customCommands, ...(options.customCommands || [])],
  };

  // Build preamble
  const lines: string[] = [];

  // Document class
  if (finalConfig.geometry) {
    lines.push(
      `\\documentclass[12pt]{${finalConfig.documentClass}}`
    );
  } else {
    lines.push(`\\documentclass{${finalConfig.documentClass}}`);
  }
  lines.push("");

  // Packages
  lines.push("% Packages");
  if (finalConfig.geometry) {
    lines.push(`\\usepackage[${finalConfig.geometry}]{geometry}`);
  }
  for (const pkg of finalConfig.packages) {
    if (pkg === "geometry") continue; // Already added with options
    if (pkg === "inputenc") {
      lines.push(`\\usepackage[utf8]{inputenc}`);
    } else if (pkg === "fontenc") {
      lines.push(`\\usepackage[T1]{fontenc}`);
    } else if (pkg === "hyperref") {
      // Hyperref should be last
      continue;
    } else {
      lines.push(`\\usepackage{${pkg}}`);
    }
  }

  if (finalConfig.packages.includes("hyperref")) {
    lines.push("\\usepackage{hyperref}");
  }
  lines.push("");

  // Custom commands
  if (finalConfig.customCommands.length > 0) {
    lines.push("% Custom commands");
    for (const cmd of finalConfig.customCommands) {
      lines.push(cmd);
    }
    lines.push("");
  }

  // Title, author, date if provided
  if (finalConfig.title) {
    lines.push(`\\title{${finalConfig.title}}`);
  }
  if (finalConfig.author) {
    lines.push(`\\author{${finalConfig.author}}`);
  }
  if (finalConfig.date) {
    lines.push(`\\date{${finalConfig.date}}`);
  } else if (finalConfig.title || finalConfig.author) {
    lines.push("\\date{\\today}");
  }

  if (finalConfig.title || finalConfig.author) {
    lines.push("");
  }

  // Begin document
  lines.push("\\begin{document}");

  if (finalConfig.title || finalConfig.author) {
    lines.push("\\maketitle");
    lines.push("");
  }

  // Insert content (trim to avoid extra whitespace)
  lines.push(content.trim());
  lines.push("");

  // End document
  lines.push("\\end{document}");

  return lines.join("\n");
}

/**
 * Smart template expansion with metadata extraction
 */
export interface ExpandedDocument {
  latex: string;
  metadata: {
    detectedType: DocumentType;
    packages: string[];
    hasTitle: boolean;
    hasMath: boolean;
    hasDiagrams: boolean;
    hasCode: boolean;
  };
}

export function smartExpand(
  content: string,
  options: {
    title?: string;
    author?: string;
    date?: string;
    forceType?: DocumentType;
  } = {}
): ExpandedDocument {
  const detectedType = options.forceType || detectDocumentType(content);
  const packages = detectRequiredPackages(content);

  const latex = expandLatexTemplate(content, detectedType, {
    title: options.title,
    author: options.author,
    date: options.date,
  });

  return {
    latex,
    metadata: {
      detectedType,
      packages,
      hasTitle: !!options.title,
      hasMath: packages.includes("amsmath"),
      hasDiagrams: packages.includes("tikz"),
      hasCode: packages.includes("listings"),
    },
  };
}
