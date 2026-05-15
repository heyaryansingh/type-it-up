/**
 * LaTeX Auto-Formatter
 *
 * Automatically formats LaTeX documents with consistent styling, proper spacing,
 * and improved readability. Applies best practices for LaTeX document structure.
 *
 * Features:
 * - Consistent indentation (2 spaces per level)
 * - Proper spacing around operators and delimiters
 * - Environment alignment and formatting
 * - Equation formatting with proper spacing
 * - Comment alignment and preservation
 * - Section hierarchy formatting
 *
 * @example
 * ```typescript
 * const formatted = formatLatex(rawLatex);
 * const options = { indentSize: 4, maxLineLength: 100 };
 * const customFormatted = formatLatex(rawLatex, options);
 * ```
 */

export interface FormatterOptions {
  /** Number of spaces per indentation level (default: 2) */
  indentSize?: number;
  /** Maximum line length before wrapping (default: 80) */
  maxLineLength?: number;
  /** Preserve existing line breaks (default: false) */
  preserveLineBreaks?: boolean;
  /** Add spacing around operators (default: true) */
  spaceAroundOperators?: boolean;
  /** Align equation equals signs (default: true) */
  alignEquations?: boolean;
  /** Format comments (default: true) */
  formatComments?: boolean;
}

const DEFAULT_OPTIONS: Required<FormatterOptions> = {
  indentSize: 2,
  maxLineLength: 80,
  preserveLineBreaks: false,
  spaceAroundOperators: true,
  alignEquations: true,
  formatComments: true,
};

/**
 * Main LaTeX formatting function
 *
 * @param latex - Raw LaTeX content to format
 * @param options - Formatter configuration options
 * @returns Formatted LaTeX content
 */
export function formatLatex(
  latex: string,
  options: FormatterOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let formatted = latex;

  // 1. Normalize line endings
  formatted = normalizeLineEndings(formatted);

  // 2. Format environments (align, equation, etc.)
  formatted = formatEnvironments(formatted, opts);

  // 3. Format document structure
  formatted = formatDocumentStructure(formatted, opts);

  // 4. Add spacing around operators
  if (opts.spaceAroundOperators) {
    formatted = addOperatorSpacing(formatted);
  }

  // 5. Format equations
  if (opts.alignEquations) {
    formatted = formatEquations(formatted);
  }

  // 6. Format comments
  if (opts.formatComments) {
    formatted = formatComments(formatted);
  }

  // 7. Apply indentation
  formatted = applyIndentation(formatted, opts.indentSize);

  // 8. Remove excessive blank lines
  formatted = removeExcessiveBlankLines(formatted);

  return formatted.trim();
}

/**
 * Normalize line endings to \n
 */
function normalizeLineEndings(latex: string): string {
  return latex.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Format LaTeX environments (align, equation, itemize, etc.)
 */
function formatEnvironments(latex: string, options: Required<FormatterOptions>): string {
  // Match \begin{env}...\end{env} blocks
  const envRegex = /\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g;

  return latex.replace(envRegex, (match, envName, content) => {
    // Format different environment types
    switch (envName) {
      case 'align':
      case 'align*':
      case 'equation':
      case 'equation*':
        content = formatMathEnvironment(content, options);
        break;
      case 'itemize':
      case 'enumerate':
        content = formatListEnvironment(content, options);
        break;
      case 'document':
        // Don't modify document environment content here
        return match;
      default:
        content = content.trim();
    }

    return `\\begin{${envName}}\n${content}\n\\end{${envName}}`;
  });
}

/**
 * Format math environments (align, equation)
 */
function formatMathEnvironment(content: string, options: Required<FormatterOptions>): string {
  const lines = content.split('\n').filter(line => line.trim());

  // Add proper spacing around operators
  const formatted = lines.map(line => {
    let formatted = line.trim();

    // Space around = signs
    formatted = formatted.replace(/\s*=\s*/g, ' = ');

    // Space around +/- signs (but not unary minus)
    formatted = formatted.replace(/(?<=[^\s+\-])\s*([+\-])\s*/g, ' $1 ');

    // Clean up double spaces
    formatted = formatted.replace(/\s+/g, ' ');

    return `  ${formatted}`;
  }).join('\n');

  return formatted;
}

/**
 * Format list environments (itemize, enumerate)
 */
function formatListEnvironment(content: string, options: Required<FormatterOptions>): string {
  const lines = content.split('\n');

  const formatted = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('\\item')) {
      return `  ${trimmed}`;
    }
    return trimmed ? `    ${trimmed}` : '';
  }).filter(line => line.trim());

  return formatted.join('\n');
}

/**
 * Format document structure (sections, subsections, etc.)
 */
function formatDocumentStructure(latex: string, options: Required<FormatterOptions>): string {
  const sectionCommands = [
    'part',
    'chapter',
    'section',
    'subsection',
    'subsubsection',
    'paragraph',
    'subparagraph'
  ];

  // Add blank line before section commands
  sectionCommands.forEach(cmd => {
    const regex = new RegExp(`([^\\n])\\n(\\\\${cmd})`, 'g');
    latex = latex.replace(regex, '$1\n\n$2');
  });

  return latex;
}

/**
 * Add spacing around mathematical operators
 */
function addOperatorSpacing(latex: string): string {
  // Don't modify content inside environments
  const envRegex = /(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\})/g;
  const parts = latex.split(envRegex);

  return parts.map((part, index) => {
    // Only format non-environment parts (even indices)
    if (index % 2 === 0) {
      // Space around = in inline math
      part = part.replace(/\$([^$]*?)\$/g, (match, math) => {
        math = math.replace(/\s*=\s*/g, ' = ');
        return `$${math}$`;
      });
    }
    return part;
  }).join('');
}

/**
 * Format equations with proper alignment
 */
function formatEquations(latex: string): string {
  // Find align environments and align equals signs
  const alignRegex = /\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g;

  return latex.replace(alignRegex, (match, content) => {
    const lines = content.split('\n').filter(line => line.trim());

    // Find position of first equals sign
    let maxEqPos = 0;
    lines.forEach(line => {
      const eqPos = line.indexOf('=');
      if (eqPos > maxEqPos) {
        maxEqPos = eqPos;
      }
    });

    // Align all equals signs
    const aligned = lines.map(line => {
      const eqPos = line.indexOf('=');
      if (eqPos >= 0) {
        const padding = ' '.repeat(maxEqPos - eqPos);
        return line.replace('=', `${padding}&=`);
      }
      return line;
    }).join('\n');

    const envName = match.includes('*') ? 'align*' : 'align';
    return `\\begin{${envName}}\n${aligned}\n\\end{${envName}}`;
  });
}

/**
 * Format comments with consistent style
 */
function formatComments(latex: string): string {
  const lines = latex.split('\n');

  return lines.map(line => {
    // Match comments (but not \%)
    if (line.match(/[^\\]%/) || line.startsWith('%')) {
      const commentMatch = line.match(/^(\s*)([^%]*)(%.*)/);
      if (commentMatch) {
        const [, indent, code, comment] = commentMatch;
        // Ensure single space after %
        const formattedComment = comment.replace(/%\s*/, '% ');
        return `${indent}${code}${formattedComment}`;
      }
    }
    return line;
  }).join('\n');
}

/**
 * Apply consistent indentation to nested structures
 */
function applyIndentation(latex: string, indentSize: number): string {
  const lines = latex.split('\n');
  let level = 0;
  const indent = ' '.repeat(indentSize);

  return lines.map(line => {
    const trimmed = line.trim();

    // Decrease indent for \end
    if (trimmed.startsWith('\\end{')) {
      level = Math.max(0, level - 1);
    }

    // Apply current indentation
    const indented = level > 0 ? indent.repeat(level) + trimmed : trimmed;

    // Increase indent for \begin
    if (trimmed.startsWith('\\begin{')) {
      level++;
    }

    return indented;
  }).join('\n');
}

/**
 * Remove excessive blank lines (more than 2 consecutive)
 */
function removeExcessiveBlankLines(latex: string): string {
  return latex.replace(/\n{3,}/g, '\n\n');
}

/**
 * Format inline math expressions
 */
export function formatInlineMath(math: string): string {
  let formatted = math;

  // Add spacing around operators
  formatted = formatted.replace(/\s*([+\-*/=])\s*/g, ' $1 ');

  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ');

  // Remove leading/trailing spaces
  formatted = formatted.trim();

  return formatted;
}

/**
 * Format display math expressions
 */
export function formatDisplayMath(math: string): string {
  let formatted = math;

  // Add line breaks for long expressions
  const maxLength = 60;
  if (formatted.length > maxLength) {
    // Break at operators
    formatted = formatted.replace(/([+\-=])\s*/g, '$1\n  ');
  }

  // Format inline as well
  const lines = formatted.split('\n');
  formatted = lines.map(line => formatInlineMath(line)).join('\n');

  return formatted;
}

/**
 * Validate formatted LaTeX for common issues
 */
export function validateFormatting(latex: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for unmatched environments
  const beginCount = (latex.match(/\\begin\{/g) || []).length;
  const endCount = (latex.match(/\\end\{/g) || []).length;
  if (beginCount !== endCount) {
    errors.push(`Unmatched environments: ${beginCount} \\begin vs ${endCount} \\end`);
  }

  // Check for unmatched braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      errors.push('Unmatched closing brace found');
      break;
    }
  }
  if (braceCount > 0) {
    errors.push(`${braceCount} unmatched opening brace(s)`);
  }

  // Check for unmatched $ signs
  const dollarCount = (latex.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    warnings.push('Odd number of $ signs - possible unmatched inline math');
  }

  // Check for excessive blank lines
  const consecutiveBlankLines = latex.match(/\n{4,}/g);
  if (consecutiveBlankLines) {
    warnings.push(`${consecutiveBlankLines.length} section(s) with >3 consecutive blank lines`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick format for simple LaTeX snippets
 */
export function quickFormat(latex: string): string {
  return formatLatex(latex, {
    indentSize: 2,
    maxLineLength: 80,
    preserveLineBreaks: false,
    spaceAroundOperators: true,
    alignEquations: true,
    formatComments: true,
  });
}

/**
 * Minimal format - only essential formatting
 */
export function minimalFormat(latex: string): string {
  return formatLatex(latex, {
    indentSize: 0,
    maxLineLength: 120,
    preserveLineBreaks: true,
    spaceAroundOperators: false,
    alignEquations: false,
    formatComments: false,
  });
}
