/**
 * Table of Contents Generator
 *
 * Automatically generates hierarchical table of contents from document headings.
 * Supports Markdown, LaTeX, and HTML document formats with customizable options.
 *
 * @module toc-generator
 * @example
 * ```typescript
 * import { generateTOC, TOCOptions } from './toc-generator';
 *
 * const content = `
 * # Introduction
 * ## Background
 * ## Motivation
 * # Methods
 * ## Data Collection
 * # Results
 * `;
 *
 * const toc = generateTOC(content, { format: 'markdown', maxDepth: 3 });
 * console.log(toc.markdown);
 * ```
 */

/**
 * Heading entry in the document structure.
 */
export interface HeadingEntry {
  /** Heading level (1-6) */
  level: number;
  /** Heading text content */
  text: string;
  /** Generated anchor/slug for linking */
  anchor: string;
  /** Line number in source document */
  lineNumber: number;
  /** Child headings */
  children: HeadingEntry[];
}

/**
 * Generated table of contents result.
 */
export interface TOCResult {
  /** Hierarchical heading structure */
  headings: HeadingEntry[];
  /** TOC rendered as Markdown */
  markdown: string;
  /** TOC rendered as HTML */
  html: string;
  /** TOC rendered as LaTeX */
  latex: string;
  /** Total heading count */
  count: number;
  /** Maximum depth found */
  maxDepthFound: number;
}

/**
 * Options for TOC generation.
 */
export interface TOCOptions {
  /** Source document format */
  format?: 'markdown' | 'latex' | 'html' | 'auto';
  /** Maximum heading depth to include (1-6) */
  maxDepth?: number;
  /** Minimum heading depth to include (1-6) */
  minDepth?: number;
  /** Whether to generate anchor links */
  includeLinks?: boolean;
  /** Prefix for anchors */
  anchorPrefix?: string;
  /** Whether to include numbering */
  numbered?: boolean;
  /** Numbering style */
  numberStyle?: 'decimal' | 'roman' | 'alpha';
  /** Custom heading filter function */
  filter?: (heading: HeadingEntry) => boolean;
}

const DEFAULT_OPTIONS: Required<TOCOptions> = {
  format: 'auto',
  maxDepth: 6,
  minDepth: 1,
  includeLinks: true,
  anchorPrefix: '',
  numbered: false,
  numberStyle: 'decimal',
  filter: () => true,
};

/**
 * Generate a URL-safe anchor/slug from heading text.
 *
 * @param text - Heading text to convert
 * @param prefix - Optional prefix for the anchor
 * @returns URL-safe anchor string
 */
export function generateAnchor(text: string, prefix: string = ''): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return prefix ? `${prefix}-${slug}` : slug;
}

/**
 * Detect document format from content.
 *
 * @param content - Document content
 * @returns Detected format
 */
export function detectFormat(content: string): 'markdown' | 'latex' | 'html' {
  // Check for LaTeX patterns
  if (
    content.includes('\\section{') ||
    content.includes('\\chapter{') ||
    content.includes('\\documentclass')
  ) {
    return 'latex';
  }

  // Check for HTML patterns
  if (/<h[1-6][^>]*>/i.test(content) || content.includes('<!DOCTYPE')) {
    return 'html';
  }

  // Default to Markdown
  return 'markdown';
}

/**
 * Extract headings from Markdown content.
 *
 * @param content - Markdown document content
 * @returns Array of heading entries
 */
function extractMarkdownHeadings(content: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const lines = content.split('\n');

  // Match ATX-style headers: # Header
  const atxPattern = /^(#{1,6})\s+(.+)$/;

  // Match Setext-style headers (underlined)
  const setextH1Pattern = /^=+$/;
  const setextH2Pattern = /^-+$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // ATX style
    const atxMatch = line.match(atxPattern);
    if (atxMatch) {
      const level = atxMatch[1].length;
      const text = atxMatch[2].replace(/\s*#+\s*$/, '').trim(); // Remove trailing #s

      headings.push({
        level,
        text,
        anchor: generateAnchor(text),
        lineNumber: i + 1,
        children: [],
      });
      continue;
    }

    // Setext style (check next line for underline)
    if (i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();

      if (setextH1Pattern.test(nextLine) && line.length > 0) {
        headings.push({
          level: 1,
          text: line,
          anchor: generateAnchor(line),
          lineNumber: i + 1,
          children: [],
        });
        continue;
      }

      if (setextH2Pattern.test(nextLine) && line.length > 0 && !line.startsWith('-')) {
        headings.push({
          level: 2,
          text: line,
          anchor: generateAnchor(line),
          lineNumber: i + 1,
          children: [],
        });
        continue;
      }
    }
  }

  return headings;
}

/**
 * Extract headings from LaTeX content.
 *
 * @param content - LaTeX document content
 * @returns Array of heading entries
 */
function extractLatexHeadings(content: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const lines = content.split('\n');

  // LaTeX sectioning commands and their levels
  const sectionCommands: Record<string, number> = {
    chapter: 1,
    section: 2,
    subsection: 3,
    subsubsection: 4,
    paragraph: 5,
    subparagraph: 6,
  };

  // Pattern: \section{Title} or \section*{Title}
  const sectionPattern = /\\(chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\{([^}]+)\}/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = sectionPattern.exec(line)) !== null) {
      const command = match[1];
      const text = match[2].trim();
      const level = sectionCommands[command] || 2;

      headings.push({
        level,
        text,
        anchor: generateAnchor(text),
        lineNumber: i + 1,
        children: [],
      });
    }

    // Reset regex
    sectionPattern.lastIndex = 0;
  }

  return headings;
}

/**
 * Extract headings from HTML content.
 *
 * @param content - HTML document content
 * @returns Array of heading entries
 */
function extractHtmlHeadings(content: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const lines = content.split('\n');

  // Pattern: <h1>Title</h1> or <h1 id="..." class="...">Title</h1>
  const headingPattern = /<h([1-6])(?:\s+[^>]*)?>([^<]+)<\/h[1-6]>/gi;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;

    while ((match = headingPattern.exec(line)) !== null) {
      const level = parseInt(match[1], 10);
      // Strip HTML tags from text
      const text = match[2].replace(/<[^>]+>/g, '').trim();

      if (text) {
        headings.push({
          level,
          text,
          anchor: generateAnchor(text),
          lineNumber: i + 1,
          children: [],
        });
      }
    }

    // Reset regex
    headingPattern.lastIndex = 0;
  }

  return headings;
}

/**
 * Build hierarchical structure from flat heading list.
 *
 * @param headings - Flat list of headings
 * @returns Hierarchical heading tree
 */
function buildHierarchy(headings: HeadingEntry[]): HeadingEntry[] {
  const root: HeadingEntry[] = [];
  const stack: HeadingEntry[] = [];

  for (const heading of headings) {
    const entry = { ...heading, children: [] };

    // Pop stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(entry);
    } else {
      stack[stack.length - 1].children.push(entry);
    }

    stack.push(entry);
  }

  return root;
}

/**
 * Convert number to Roman numerals.
 *
 * @param num - Number to convert
 * @returns Roman numeral string
 */
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}

/**
 * Convert number to alphabetic (a, b, c, ..., aa, ab, ...).
 *
 * @param num - Number to convert (1-indexed)
 * @returns Alphabetic string
 */
function toAlpha(num: number): string {
  let result = '';
  while (num > 0) {
    num--;
    result = String.fromCharCode(97 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

/**
 * Format number according to style.
 *
 * @param num - Number to format
 * @param style - Numbering style
 * @returns Formatted number string
 */
function formatNumber(num: number, style: 'decimal' | 'roman' | 'alpha'): string {
  switch (style) {
    case 'roman':
      return toRoman(num).toLowerCase();
    case 'alpha':
      return toAlpha(num);
    default:
      return num.toString();
  }
}

/**
 * Render TOC as Markdown.
 *
 * @param headings - Hierarchical headings
 * @param options - TOC options
 * @param counters - Numbering counters
 * @param depth - Current depth
 * @returns Markdown TOC string
 */
function renderMarkdown(
  headings: HeadingEntry[],
  options: Required<TOCOptions>,
  counters: number[] = [],
  depth: number = 0
): string {
  let result = '';
  let counter = 0;

  for (const heading of headings) {
    counter++;
    const currentCounters = [...counters, counter];

    const indent = '  '.repeat(depth);
    let prefix = '';

    if (options.numbered) {
      const numbers = currentCounters.map((n, i) =>
        formatNumber(n, options.numberStyle)
      );
      prefix = numbers.join('.') + '. ';
    } else {
      prefix = '- ';
    }

    if (options.includeLinks) {
      result += `${indent}${prefix}[${heading.text}](#${heading.anchor})\n`;
    } else {
      result += `${indent}${prefix}${heading.text}\n`;
    }

    if (heading.children.length > 0) {
      result += renderMarkdown(heading.children, options, currentCounters, depth + 1);
    }
  }

  return result;
}

/**
 * Render TOC as HTML.
 *
 * @param headings - Hierarchical headings
 * @param options - TOC options
 * @param counters - Numbering counters
 * @returns HTML TOC string
 */
function renderHtml(
  headings: HeadingEntry[],
  options: Required<TOCOptions>,
  counters: number[] = []
): string {
  if (headings.length === 0) return '';

  let result = '<ul>\n';
  let counter = 0;

  for (const heading of headings) {
    counter++;
    const currentCounters = [...counters, counter];

    let prefix = '';
    if (options.numbered) {
      const numbers = currentCounters.map((n) => formatNumber(n, options.numberStyle));
      prefix = `<span class="toc-number">${numbers.join('.')}</span> `;
    }

    if (options.includeLinks) {
      result += `  <li>${prefix}<a href="#${heading.anchor}">${heading.text}</a>`;
    } else {
      result += `  <li>${prefix}${heading.text}`;
    }

    if (heading.children.length > 0) {
      result += '\n' + renderHtml(heading.children, options, currentCounters);
      result += '  </li>\n';
    } else {
      result += '</li>\n';
    }
  }

  result += '</ul>';
  return result;
}

/**
 * Render TOC as LaTeX.
 *
 * @param headings - Hierarchical headings
 * @param options - TOC options
 * @param counters - Numbering counters
 * @param depth - Current depth
 * @returns LaTeX TOC string
 */
function renderLatex(
  headings: HeadingEntry[],
  options: Required<TOCOptions>,
  counters: number[] = [],
  depth: number = 0
): string {
  if (headings.length === 0) return '';

  const envName = depth === 0 ? 'enumerate' : 'enumerate';
  let result = `\\begin{${envName}}\n`;
  let counter = 0;

  for (const heading of headings) {
    counter++;
    const currentCounters = [...counters, counter];

    let prefix = '';
    if (options.numbered) {
      const numbers = currentCounters.map((n) => formatNumber(n, options.numberStyle));
      prefix = `${numbers.join('.')} `;
    }

    if (options.includeLinks) {
      result += `  \\item ${prefix}\\hyperref[${heading.anchor}]{${heading.text}}\n`;
    } else {
      result += `  \\item ${prefix}${heading.text}\n`;
    }

    if (heading.children.length > 0) {
      result += renderLatex(heading.children, options, currentCounters, depth + 1);
    }
  }

  result += `\\end{${envName}}\n`;
  return result;
}

/**
 * Count headings at each level.
 *
 * @param headings - Hierarchical headings
 * @returns Map of level to count
 */
function countHeadings(headings: HeadingEntry[]): { total: number; maxDepth: number } {
  let total = 0;
  let maxDepth = 0;

  function traverse(entries: HeadingEntry[], depth: number): void {
    for (const entry of entries) {
      total++;
      maxDepth = Math.max(maxDepth, depth);
      traverse(entry.children, depth + 1);
    }
  }

  traverse(headings, 1);
  return { total, maxDepth };
}

/**
 * Filter headings by depth constraints.
 *
 * @param headings - Flat list of headings
 * @param minDepth - Minimum depth to include
 * @param maxDepth - Maximum depth to include
 * @param filter - Custom filter function
 * @returns Filtered headings
 */
function filterHeadings(
  headings: HeadingEntry[],
  minDepth: number,
  maxDepth: number,
  filter: (h: HeadingEntry) => boolean
): HeadingEntry[] {
  return headings
    .filter((h) => h.level >= minDepth && h.level <= maxDepth)
    .filter(filter);
}

/**
 * Generate a table of contents from document content.
 *
 * @param content - Document content (Markdown, LaTeX, or HTML)
 * @param options - TOC generation options
 * @returns TOC result with multiple output formats
 *
 * @example
 * ```typescript
 * const markdown = `
 * # Introduction
 * ## Background
 * # Methods
 * ## Data Collection
 * ## Analysis
 * # Results
 * `;
 *
 * const toc = generateTOC(markdown);
 * console.log(toc.markdown);
 * // Output:
 * // - [Introduction](#introduction)
 * //   - [Background](#background)
 * // - [Methods](#methods)
 * //   - [Data Collection](#data-collection)
 * //   - [Analysis](#analysis)
 * // - [Results](#results)
 * ```
 */
export function generateTOC(content: string, options: TOCOptions = {}): TOCResult {
  const opts: Required<TOCOptions> = { ...DEFAULT_OPTIONS, ...options };

  // Detect format if auto
  const format = opts.format === 'auto' ? detectFormat(content) : opts.format;

  // Extract headings based on format
  let flatHeadings: HeadingEntry[];
  switch (format) {
    case 'latex':
      flatHeadings = extractLatexHeadings(content);
      break;
    case 'html':
      flatHeadings = extractHtmlHeadings(content);
      break;
    default:
      flatHeadings = extractMarkdownHeadings(content);
  }

  // Apply anchor prefix
  if (opts.anchorPrefix) {
    flatHeadings = flatHeadings.map((h) => ({
      ...h,
      anchor: generateAnchor(h.text, opts.anchorPrefix),
    }));
  }

  // Filter by depth and custom filter
  const filteredHeadings = filterHeadings(
    flatHeadings,
    opts.minDepth,
    opts.maxDepth,
    opts.filter
  );

  // Build hierarchy
  const hierarchical = buildHierarchy(filteredHeadings);

  // Count stats
  const { total, maxDepth } = countHeadings(hierarchical);

  // Render outputs
  const markdown = renderMarkdown(hierarchical, opts);
  const html = renderHtml(hierarchical, opts);
  const latex = renderLatex(hierarchical, opts);

  return {
    headings: hierarchical,
    markdown: markdown.trim(),
    html,
    latex,
    count: total,
    maxDepthFound: maxDepth,
  };
}

/**
 * Insert TOC into document at specified marker.
 *
 * @param content - Document content
 * @param marker - Marker string to replace with TOC (e.g., "<!-- TOC -->")
 * @param options - TOC options
 * @returns Document with TOC inserted
 */
export function insertTOC(
  content: string,
  marker: string = '<!-- TOC -->',
  options: TOCOptions = {}
): string {
  const toc = generateTOC(content, options);

  const format = options.format === 'auto' ? detectFormat(content) : options.format;

  let tocContent: string;
  switch (format) {
    case 'latex':
      tocContent = toc.latex;
      break;
    case 'html':
      tocContent = toc.html;
      break;
    default:
      tocContent = toc.markdown;
  }

  // Replace single marker
  if (content.includes(marker)) {
    return content.replace(marker, tocContent);
  }

  // Replace marker pair (<!-- TOC --> ... <!-- /TOC -->)
  const endMarker = marker.replace('-->', '/TOC -->').replace('>', '/>');
  const pairPattern = new RegExp(
    escapeRegex(marker) + '[\\s\\S]*?' + escapeRegex(endMarker),
    'g'
  );

  if (pairPattern.test(content)) {
    return content.replace(pairPattern, `${marker}\n${tocContent}\n${endMarker}`);
  }

  return content;
}

/**
 * Escape special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate document heading structure.
 *
 * @param content - Document content
 * @param options - TOC options
 * @returns Validation result with issues
 */
export function validateHeadings(
  content: string,
  options: TOCOptions = {}
): {
  valid: boolean;
  issues: string[];
  headings: HeadingEntry[];
} {
  const toc = generateTOC(content, options);
  const issues: string[] = [];

  // Check for skipped levels
  let previousLevel = 0;
  function checkSkipped(headings: HeadingEntry[]): void {
    for (const heading of headings) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        issues.push(
          `Line ${heading.lineNumber}: Skipped heading level (${previousLevel} to ${heading.level}): "${heading.text}"`
        );
      }
      previousLevel = heading.level;
      checkSkipped(heading.children);
    }
  }
  checkSkipped(toc.headings);

  // Check for duplicate anchors
  const anchors = new Map<string, number[]>();
  function collectAnchors(headings: HeadingEntry[]): void {
    for (const heading of headings) {
      const existing = anchors.get(heading.anchor) || [];
      existing.push(heading.lineNumber);
      anchors.set(heading.anchor, existing);
      collectAnchors(heading.children);
    }
  }
  collectAnchors(toc.headings);

  for (const [anchor, lines] of anchors) {
    if (lines.length > 1) {
      issues.push(`Duplicate anchor "${anchor}" on lines: ${lines.join(', ')}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    headings: toc.headings,
  };
}
