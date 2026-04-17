/**
 * @fileoverview Format Converter - Convert between document formats
 * @module lib/format-converter
 *
 * Provides utilities for converting documents between various formats:
 * - LaTeX to Markdown and vice versa
 * - HTML to Markdown
 * - Plain text to formatted output
 * - Document structure extraction
 *
 * @example
 * ```typescript
 * import { FormatConverter, ConversionOptions } from './format-converter';
 *
 * const converter = new FormatConverter();
 * const markdown = converter.latexToMarkdown(latexSource);
 * const latex = converter.markdownToLatex(markdownSource);
 * ```
 */

export interface ConversionOptions {
  /** Preserve comments in output */
  preserveComments?: boolean;
  /** Include metadata/frontmatter */
  includeMetadata?: boolean;
  /** Handle unknown commands gracefully */
  lenientMode?: boolean;
  /** Custom command mappings */
  customMappings?: Record<string, string>;
}

export interface ConversionResult {
  /** Converted content */
  content: string;
  /** Warnings generated during conversion */
  warnings: string[];
  /** Metadata extracted from source */
  metadata: DocumentMetadata;
  /** Whether conversion was fully successful */
  success: boolean;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  date?: string;
  abstract?: string;
  keywords?: string[];
  documentClass?: string;
}

/**
 * Map of LaTeX commands to Markdown equivalents
 */
const LATEX_TO_MD_MAP: Record<string, (content: string) => string> = {
  '\\textbf': (c) => `**${c}**`,
  '\\textit': (c) => `*${c}*`,
  '\\emph': (c) => `*${c}*`,
  '\\underline': (c) => `<u>${c}</u>`,
  '\\texttt': (c) => `\`${c}\``,
  '\\verb': (c) => `\`${c}\``,
  '\\url': (c) => `<${c}>`,
  '\\href': (c) => c, // Handled specially
  '\\cite': (c) => `[${c}]`,
  '\\ref': (c) => `[${c}]`,
  '\\label': () => '', // Labels are stripped
};

/**
 * Map of Markdown patterns to LaTeX equivalents
 */
const MD_TO_LATEX_MAP: Array<{pattern: RegExp; replacement: string | ((match: string, ...groups: string[]) => string)}> = [
  { pattern: /\*\*(.+?)\*\*/g, replacement: '\\textbf{$1}' },
  { pattern: /\*(.+?)\*/g, replacement: '\\textit{$1}' },
  { pattern: /__(.+?)__/g, replacement: '\\textbf{$1}' },
  { pattern: /_(.+?)_/g, replacement: '\\textit{$1}' },
  { pattern: /`(.+?)`/g, replacement: '\\texttt{$1}' },
  { pattern: /^# (.+)$/gm, replacement: '\\section{$1}' },
  { pattern: /^## (.+)$/gm, replacement: '\\subsection{$1}' },
  { pattern: /^### (.+)$/gm, replacement: '\\subsubsection{$1}' },
  { pattern: /^#### (.+)$/gm, replacement: '\\paragraph{$1}' },
  { pattern: /^\* (.+)$/gm, replacement: '\\item $1' },
  { pattern: /^- (.+)$/gm, replacement: '\\item $1' },
  { pattern: /^\d+\. (.+)$/gm, replacement: '\\item $1' },
  { pattern: /\[(.+?)\]\((.+?)\)/g, replacement: '\\href{$2}{$1}' },
  { pattern: /!\[(.+?)\]\((.+?)\)/g, replacement: '\\includegraphics{$2}' },
  { pattern: /^> (.+)$/gm, replacement: '\\begin{quote}\n$1\n\\end{quote}' },
  { pattern: /^---$/gm, replacement: '\\hrule' },
  { pattern: /\\\\/g, replacement: '\\newline' },
];

/**
 * Format converter for document transformations
 *
 * Supports bidirectional conversion between LaTeX and Markdown,
 * with options for preserving metadata and handling edge cases.
 *
 * @example
 * ```typescript
 * const converter = new FormatConverter({ lenientMode: true });
 * const result = converter.latexToMarkdown(latexSource);
 * if (!result.success) {
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 */
export class FormatConverter {
  private options: ConversionOptions;

  /**
   * Create a new format converter
   * @param options - Conversion configuration options
   */
  constructor(options: ConversionOptions = {}) {
    this.options = {
      preserveComments: false,
      includeMetadata: true,
      lenientMode: true,
      ...options,
    };
  }

  /**
   * Convert LaTeX source to Markdown
   *
   * @param latex - LaTeX source string
   * @returns Conversion result with Markdown content
   *
   * @example
   * ```typescript
   * const latex = '\\textbf{Hello} \\textit{World}';
   * const result = converter.latexToMarkdown(latex);
   * // result.content === '**Hello** *World*'
   * ```
   */
  latexToMarkdown(latex: string): ConversionResult {
    const warnings: string[] = [];
    let content = latex;
    const metadata: DocumentMetadata = {};

    // Extract metadata from preamble
    const titleMatch = latex.match(/\\title\{(.+?)\}/);
    if (titleMatch) metadata.title = titleMatch[1];

    const authorMatch = latex.match(/\\author\{(.+?)\}/);
    if (authorMatch) metadata.author = authorMatch[1];

    const dateMatch = latex.match(/\\date\{(.+?)\}/);
    if (dateMatch) metadata.date = dateMatch[1];

    const abstractMatch = latex.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
    if (abstractMatch) metadata.abstract = abstractMatch[1].trim();

    const classMatch = latex.match(/\\documentclass(?:\[.*?\])?\{(.+?)\}/);
    if (classMatch) metadata.documentClass = classMatch[1];

    // Remove preamble (everything before \begin{document})
    const docStart = content.indexOf('\\begin{document}');
    const docEnd = content.indexOf('\\end{document}');
    if (docStart !== -1 && docEnd !== -1) {
      content = content.substring(docStart + '\\begin{document}'.length, docEnd);
    }

    // Remove comments unless preserving
    if (!this.options.preserveComments) {
      content = content.replace(/(?<!\\)%.*$/gm, '');
    }

    // Convert sections
    content = content.replace(/\\section\*?\{(.+?)\}/g, '# $1');
    content = content.replace(/\\subsection\*?\{(.+?)\}/g, '## $1');
    content = content.replace(/\\subsubsection\*?\{(.+?)\}/g, '### $1');
    content = content.replace(/\\paragraph\*?\{(.+?)\}/g, '#### $1');

    // Convert formatting commands
    for (const [cmd, converter] of Object.entries(LATEX_TO_MD_MAP)) {
      const escapedCmd = cmd.replace(/\\/g, '\\\\');
      const regex = new RegExp(`${escapedCmd}\\{([^}]*)\\}`, 'g');
      content = content.replace(regex, (_, inner) => converter(inner));
    }

    // Convert environments
    content = this.convertLatexEnvironments(content, warnings);

    // Convert special characters
    content = content.replace(/\\&/g, '&');
    content = content.replace(/\\%/g, '%');
    content = content.replace(/\\\$/g, '$');
    content = content.replace(/\\_/g, '_');
    content = content.replace(/\\#/g, '#');
    content = content.replace(/\\\{/g, '{');
    content = content.replace(/\\\}/g, '}');
    content = content.replace(/~/g, ' ');
    content = content.replace(/\\,/g, ' ');
    content = content.replace(/\\\s/g, ' ');
    content = content.replace(/\\newline/g, '\n');
    content = content.replace(/\\\\/g, '\n');

    // Clean up extra whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();

    // Add YAML frontmatter if metadata exists
    if (this.options.includeMetadata && Object.keys(metadata).length > 0) {
      const frontmatter = this.generateYamlFrontmatter(metadata);
      content = frontmatter + '\n\n' + content;
    }

    return {
      content,
      warnings,
      metadata,
      success: warnings.length === 0,
    };
  }

  /**
   * Convert Markdown source to LaTeX
   *
   * @param markdown - Markdown source string
   * @param documentClass - LaTeX document class (default: 'article')
   * @returns Conversion result with LaTeX content
   *
   * @example
   * ```typescript
   * const md = '# Hello\n\n**Bold** and *italic*';
   * const result = converter.markdownToLatex(md);
   * // result.content includes full LaTeX document
   * ```
   */
  markdownToLatex(markdown: string, documentClass: string = 'article'): ConversionResult {
    const warnings: string[] = [];
    let content = markdown;
    const metadata: DocumentMetadata = { documentClass };

    // Extract YAML frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const fm = this.parseYamlFrontmatter(frontmatterMatch[1]);
      Object.assign(metadata, fm);
      content = content.substring(frontmatterMatch[0].length).trim();
    }

    // Apply conversion mappings
    for (const { pattern, replacement } of MD_TO_LATEX_MAP) {
      if (typeof replacement === 'string') {
        content = content.replace(pattern, replacement);
      } else {
        content = content.replace(pattern, replacement);
      }
    }

    // Convert code blocks
    content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      if (lang) {
        return `\\begin{lstlisting}[language=${lang}]\n${code}\\end{lstlisting}`;
      }
      return `\\begin{verbatim}\n${code}\\end{verbatim}`;
    });

    // Convert inline math
    content = content.replace(/\$(.+?)\$/g, '$$$1$$');

    // Convert display math
    content = content.replace(/\$\$\n?([\s\S]*?)\n?\$\$/g, '\\[\n$1\n\\]');

    // Wrap lists
    content = this.wrapLatexLists(content);

    // Build full document
    const preamble = this.generateLatexPreamble(metadata);
    const fullDocument = `${preamble}
\\begin{document}

${metadata.title ? `\\maketitle\n\n` : ''}${content}

\\end{document}`;

    return {
      content: fullDocument,
      warnings,
      metadata,
      success: warnings.length === 0,
    };
  }

  /**
   * Convert HTML content to Markdown
   *
   * @param html - HTML source string
   * @returns Conversion result with Markdown content
   */
  htmlToMarkdown(html: string): ConversionResult {
    const warnings: string[] = [];
    let content = html;
    const metadata: DocumentMetadata = {};

    // Extract title from <title> tag
    const titleMatch = html.match(/<title>(.+?)<\/title>/i);
    if (titleMatch) metadata.title = titleMatch[1];

    // Remove scripts and styles
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Convert headings
    content = content.replace(/<h1[^>]*>(.+?)<\/h1>/gi, '# $1\n');
    content = content.replace(/<h2[^>]*>(.+?)<\/h2>/gi, '## $1\n');
    content = content.replace(/<h3[^>]*>(.+?)<\/h3>/gi, '### $1\n');
    content = content.replace(/<h4[^>]*>(.+?)<\/h4>/gi, '#### $1\n');
    content = content.replace(/<h5[^>]*>(.+?)<\/h5>/gi, '##### $1\n');
    content = content.replace(/<h6[^>]*>(.+?)<\/h6>/gi, '###### $1\n');

    // Convert formatting
    content = content.replace(/<strong[^>]*>(.+?)<\/strong>/gi, '**$1**');
    content = content.replace(/<b[^>]*>(.+?)<\/b>/gi, '**$1**');
    content = content.replace(/<em[^>]*>(.+?)<\/em>/gi, '*$1*');
    content = content.replace(/<i[^>]*>(.+?)<\/i>/gi, '*$1*');
    content = content.replace(/<code[^>]*>(.+?)<\/code>/gi, '`$1`');
    content = content.replace(/<u[^>]*>(.+?)<\/u>/gi, '<u>$1</u>');

    // Convert links
    content = content.replace(/<a[^>]*href="([^"]*)"[^>]*>(.+?)<\/a>/gi, '[$2]($1)');

    // Convert images
    content = content.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    content = content.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

    // Convert lists
    content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
      return items.replace(/<li[^>]*>(.+?)<\/li>/gi, '* $1\n');
    });
    content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
      let counter = 1;
      return items.replace(/<li[^>]*>(.+?)<\/li>/gi, () => `${counter++}. $1\n`);
    });

    // Convert paragraphs and line breaks
    content = content.replace(/<p[^>]*>(.+?)<\/p>/gi, '$1\n\n');
    content = content.replace(/<br\s*\/?>/gi, '\n');
    content = content.replace(/<hr\s*\/?>/gi, '\n---\n');

    // Convert blockquotes
    content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
      return text.split('\n').map((line: string) => `> ${line.trim()}`).join('\n');
    });

    // Convert code blocks
    content = content.replace(/<pre[^>]*><code[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, lang, code) => {
      const language = lang.replace(/^language-/, '');
      return `\`\`\`${language}\n${this.decodeHtmlEntities(code)}\`\`\``;
    });
    content = content.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```');

    // Remove remaining HTML tags
    content = content.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    content = this.decodeHtmlEntities(content);

    // Clean up whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trim();

    return {
      content,
      warnings,
      metadata,
      success: true,
    };
  }

  /**
   * Extract plain text from LaTeX source
   *
   * @param latex - LaTeX source string
   * @returns Plain text content
   */
  latexToPlainText(latex: string): string {
    let text = latex;

    // Remove preamble
    const docStart = text.indexOf('\\begin{document}');
    const docEnd = text.indexOf('\\end{document}');
    if (docStart !== -1 && docEnd !== -1) {
      text = text.substring(docStart + '\\begin{document}'.length, docEnd);
    }

    // Remove comments
    text = text.replace(/(?<!\\)%.*$/gm, '');

    // Remove all commands
    text = text.replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^}]*)\})?/g, '$1');

    // Remove remaining braces
    text = text.replace(/[{}]/g, '');

    // Convert special characters
    text = text.replace(/\\&/g, '&');
    text = text.replace(/\\%/g, '%');
    text = text.replace(/\\\$/g, '$');
    text = text.replace(/\\_/g, '_');
    text = text.replace(/\\#/g, '#');
    text = text.replace(/~/g, ' ');

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text;
  }

  /**
   * Convert LaTeX environments to Markdown
   */
  private convertLatexEnvironments(content: string, warnings: string[]): string {
    // Itemize/enumerate to bullet/numbered lists
    content = content.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, items) => {
      return items.replace(/\\item\s*/g, '* ').trim();
    });

    content = content.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, items) => {
      let counter = 1;
      return items.replace(/\\item\s*/g, () => `${counter++}. `).trim();
    });

    // Quote environment
    content = content.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, text) => {
      return text.split('\n').map((line: string) => `> ${line.trim()}`).join('\n');
    });

    // Verbatim to code block
    content = content.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, '```\n$1```');

    // Lstlisting to code block
    content = content.replace(/\\begin\{lstlisting\}(?:\[.*?\])?([\s\S]*?)\\end\{lstlisting\}/g, '```\n$1```');

    // Equation environments to display math
    content = content.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, '\n$$\n$1\n$$\n');
    content = content.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, '\n$$\n$1\n$$\n');

    // Figure environment (simplified)
    content = content.replace(/\\begin\{figure\}[\s\S]*?\\includegraphics(?:\[.*?\])?\{(.+?)\}[\s\S]*?\\caption\{(.+?)\}[\s\S]*?\\end\{figure\}/g,
      '![$2]($1)');

    // Table environment warning
    if (content.includes('\\begin{tabular}')) {
      warnings.push('Table environments detected - manual conversion recommended');
    }

    return content;
  }

  /**
   * Wrap consecutive list items in LaTeX list environments
   */
  private wrapLatexLists(content: string): string {
    // Find consecutive \item lines and wrap in itemize
    const lines = content.split('\n');
    const result: string[] = [];
    let inList = false;

    for (const line of lines) {
      if (line.trim().startsWith('\\item')) {
        if (!inList) {
          result.push('\\begin{itemize}');
          inList = true;
        }
        result.push(line);
      } else {
        if (inList) {
          result.push('\\end{itemize}');
          inList = false;
        }
        result.push(line);
      }
    }

    if (inList) {
      result.push('\\end{itemize}');
    }

    return result.join('\n');
  }

  /**
   * Generate YAML frontmatter from metadata
   */
  private generateYamlFrontmatter(metadata: DocumentMetadata): string {
    const lines = ['---'];
    if (metadata.title) lines.push(`title: "${metadata.title}"`);
    if (metadata.author) lines.push(`author: "${metadata.author}"`);
    if (metadata.date) lines.push(`date: "${metadata.date}"`);
    if (metadata.keywords?.length) lines.push(`keywords: [${metadata.keywords.join(', ')}]`);
    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Parse YAML frontmatter to metadata
   */
  private parseYamlFrontmatter(yaml: string): Partial<DocumentMetadata> {
    const metadata: Partial<DocumentMetadata> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'title') metadata.title = value;
        else if (key === 'author') metadata.author = value;
        else if (key === 'date') metadata.date = value;
        else if (key === 'keywords') {
          metadata.keywords = value.replace(/[\[\]]/g, '').split(',').map(k => k.trim());
        }
      }
    }

    return metadata;
  }

  /**
   * Generate LaTeX preamble from metadata
   */
  private generateLatexPreamble(metadata: DocumentMetadata): string {
    const packages = [
      'inputenc',
      'fontenc',
      'amsmath',
      'amssymb',
      'graphicx',
      'hyperref',
      'listings',
    ];

    const lines = [
      `\\documentclass{${metadata.documentClass || 'article'}}`,
      '',
      ...packages.map(pkg => `\\usepackage{${pkg}}`),
      '',
    ];

    if (metadata.title) lines.push(`\\title{${metadata.title}}`);
    if (metadata.author) lines.push(`\\author{${metadata.author}}`);
    if (metadata.date) lines.push(`\\date{${metadata.date}}`);
    else lines.push('\\date{\\today}');

    return lines.join('\n');
  }

  /**
   * Decode HTML entities to characters
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '…',
      '&copy;': '©',
      '&reg;': '®',
      '&trade;': '™',
    };

    for (const [entity, char] of Object.entries(entities)) {
      text = text.replace(new RegExp(entity, 'g'), char);
    }

    // Numeric entities
    text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
    text = text.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

    return text;
  }
}

/**
 * Quick conversion utilities
 */
export const convert = {
  /**
   * Convert LaTeX to Markdown
   */
  latexToMarkdown: (latex: string, options?: ConversionOptions): string => {
    return new FormatConverter(options).latexToMarkdown(latex).content;
  },

  /**
   * Convert Markdown to LaTeX
   */
  markdownToLatex: (markdown: string, options?: ConversionOptions): string => {
    return new FormatConverter(options).markdownToLatex(markdown).content;
  },

  /**
   * Convert HTML to Markdown
   */
  htmlToMarkdown: (html: string, options?: ConversionOptions): string => {
    return new FormatConverter(options).htmlToMarkdown(html).content;
  },

  /**
   * Extract plain text from LaTeX
   */
  latexToText: (latex: string): string => {
    return new FormatConverter().latexToPlainText(latex);
  },
};

export default FormatConverter;
