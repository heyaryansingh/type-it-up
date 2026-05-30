/**
 * Bibliography management utilities for LaTeX documents.
 * Handles BibTeX parsing, citation validation, and reference formatting.
 */

export interface BibEntry {
  key: string;
  type: string;
  fields: Record<string, string>;
  rawText: string;
}

export interface CitationAnalysis {
  citedKeys: string[];
  missingKeys: string[];
  unusedKeys: string[];
  duplicateKeys: string[];
}

export type BibEntryType =
  | 'article'
  | 'book'
  | 'inproceedings'
  | 'misc'
  | 'phdthesis'
  | 'mastersthesis'
  | 'techreport'
  | 'unpublished';

/**
 * Required fields for each BibTeX entry type.
 */
const REQUIRED_FIELDS: Record<BibEntryType, string[]> = {
  article: ['author', 'title', 'journal', 'year'],
  book: ['author', 'title', 'publisher', 'year'],
  inproceedings: ['author', 'title', 'booktitle', 'year'],
  misc: ['title'],
  phdthesis: ['author', 'title', 'school', 'year'],
  mastersthesis: ['author', 'title', 'school', 'year'],
  techreport: ['author', 'title', 'institution', 'year'],
  unpublished: ['author', 'title', 'note'],
};

/**
 * Parse BibTeX content into structured entries.
 */
export function parseBibTeX(bibContent: string): BibEntry[] {
  const entries: BibEntry[] = [];

  // Match @type{key, ...} entries
  const entryPattern = /@(\w+)\s*\{\s*([^,\s]+)\s*,([^@]*)\}/g;
  let match;

  while ((match = entryPattern.exec(bibContent)) !== null) {
    const [rawText, type, key, fieldsText] = match;

    const fields = parseFields(fieldsText);

    entries.push({
      key: key.trim(),
      type: type.toLowerCase(),
      fields,
      rawText,
    });
  }

  return entries;
}

/**
 * Parse field = {value} or field = "value" pairs.
 */
function parseFields(fieldsText: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Match field = {value} or field = "value"
  const fieldPattern = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d+))/g;
  let match;

  while ((match = fieldPattern.exec(fieldsText)) !== null) {
    const fieldName = match[1].toLowerCase();
    const fieldValue = match[2] || match[3] || match[4] || '';

    fields[fieldName] = fieldValue.trim();
  }

  return fields;
}

/**
 * Extract citation keys from LaTeX document.
 */
export function extractCitations(latexContent: string): string[] {
  const citations: string[] = [];

  // Match \cite{key1,key2,...} and variants
  const citePatterns = [
    /\\cite\{([^}]+)\}/g,
    /\\citep\{([^}]+)\}/g,
    /\\citet\{([^}]+)\}/g,
    /\\citealp\{([^}]+)\}/g,
    /\\citealt\{([^}]+)\}/g,
    /\\citeauthor\{([^}]+)\}/g,
    /\\citeyear\{([^}]+)\}/g,
  ];

  for (const pattern of citePatterns) {
    let match;
    while ((match = pattern.exec(latexContent)) !== null) {
      const keys = match[1].split(',').map(k => k.trim());
      citations.push(...keys);
    }
  }

  return Array.from(new Set(citations));
}

/**
 * Analyze citations and bibliography for issues.
 */
export function analyzeCitations(
  latexContent: string,
  bibContent: string
): CitationAnalysis {
  const citedKeys = extractCitations(latexContent);
  const bibEntries = parseBibTeX(bibContent);
  const bibKeys = bibEntries.map(entry => entry.key);

  // Find missing citations (cited but not in bib)
  const missingKeys = citedKeys.filter(key => !bibKeys.includes(key));

  // Find unused entries (in bib but not cited)
  const unusedKeys = bibKeys.filter(key => !citedKeys.includes(key));

  // Find duplicate keys
  const keyCount = new Map<string, number>();
  bibKeys.forEach(key => {
    keyCount.set(key, (keyCount.get(key) || 0) + 1);
  });
  const duplicateKeys = Array.from(keyCount.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);

  return {
    citedKeys,
    missingKeys,
    unusedKeys,
    duplicateKeys,
  };
}

/**
 * Validate BibTeX entry for required fields.
 */
export function validateEntry(entry: BibEntry): string[] {
  const errors: string[] = [];
  const required = REQUIRED_FIELDS[entry.type as BibEntryType];

  if (!required) {
    errors.push(`Unknown entry type: ${entry.type}`);
    return errors;
  }

  for (const field of required) {
    if (!entry.fields[field] || entry.fields[field].trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return errors;
}

/**
 * Format BibTeX entry to consistent style.
 */
export function formatBibEntry(entry: BibEntry, indent: string = '  '): string {
  const lines: string[] = [];

  lines.push(`@${entry.type}{${entry.key},`);

  // Sort fields alphabetically
  const sortedFields = Object.entries(entry.fields).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  sortedFields.forEach(([field, value], index) => {
    const isLast = index === sortedFields.length - 1;
    const comma = isLast ? '' : ',';

    // Determine if value should be wrapped in quotes or braces
    const needsBraces =
      value.includes('{') ||
      value.includes('}') ||
      value.includes('\\') ||
      /[A-Z]/.test(value);

    const wrappedValue = needsBraces ? `{${value}}` : `"${value}"`;

    lines.push(`${indent}${field} = ${wrappedValue}${comma}`);
  });

  lines.push('}');

  return lines.join('\n');
}

/**
 * Sort bibliography entries.
 */
export function sortBibliography(
  entries: BibEntry[],
  sortBy: 'key' | 'author' | 'year' = 'key'
): BibEntry[] {
  return [...entries].sort((a, b) => {
    if (sortBy === 'key') {
      return a.key.localeCompare(b.key);
    }

    if (sortBy === 'author') {
      const authorA = a.fields.author || '';
      const authorB = b.fields.author || '';
      return authorA.localeCompare(authorB);
    }

    if (sortBy === 'year') {
      const yearA = parseInt(a.fields.year || '0', 10);
      const yearB = parseInt(b.fields.year || '0', 10);
      return yearB - yearA;
    }

    return 0;
  });
}

/**
 * Generate citation key from entry data.
 */
export function generateCitationKey(entry: BibEntry): string {
  const author = entry.fields.author || 'Unknown';
  const year = entry.fields.year || 'YYYY';

  // Extract last name of first author
  const firstAuthor = author.split(' and ')[0];
  const lastName = firstAuthor.split(',')[0].trim();

  // Clean last name (remove special characters)
  const cleanName = lastName.replace(/[^a-zA-Z]/g, '');

  // Extract first word of title
  const title = entry.fields.title || '';
  const firstWord = title.split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');

  return `${cleanName}${year}${firstWord}`.toLowerCase();
}

/**
 * Merge duplicate entries intelligently.
 */
export function mergeDuplicates(entries: BibEntry[]): BibEntry[] {
  const keyMap = new Map<string, BibEntry>();

  for (const entry of entries) {
    if (!keyMap.has(entry.key)) {
      keyMap.set(entry.key, entry);
    } else {
      // Merge fields from duplicate entry
      const existing = keyMap.get(entry.key)!;
      const merged = {
        ...existing,
        fields: { ...existing.fields, ...entry.fields },
      };
      keyMap.set(entry.key, merged);
    }
  }

  return Array.from(keyMap.values());
}

/**
 * Convert BibTeX to formatted reference list.
 */
export function generateReferenceList(
  entries: BibEntry[],
  style: 'apa' | 'ieee' | 'chicago' = 'apa'
): string[] {
  return entries.map(entry => formatReference(entry, style));
}

/**
 * Format single reference in specified style.
 */
function formatReference(entry: BibEntry, style: string): string {
  const { fields } = entry;
  const author = fields.author || 'Unknown';
  const year = fields.year || 'n.d.';
  const title = fields.title || 'Untitled';

  if (style === 'apa') {
    return formatAPA(entry);
  } else if (style === 'ieee') {
    return formatIEEE(entry);
  } else if (style === 'chicago') {
    return formatChicago(entry);
  }

  return `${author} (${year}). ${title}`;
}

function formatAPA(entry: BibEntry): string {
  const { fields } = entry;
  const author = fields.author?.replace(' and ', ', & ') || 'Unknown';
  const year = fields.year || 'n.d.';
  const title = fields.title || 'Untitled';

  if (entry.type === 'article') {
    const journal = fields.journal || '';
    const volume = fields.volume || '';
    const pages = fields.pages || '';

    return `${author} (${year}). ${title}. *${journal}*, *${volume}*, ${pages}.`;
  }

  if (entry.type === 'book') {
    const publisher = fields.publisher || '';
    return `${author} (${year}). *${title}*. ${publisher}.`;
  }

  return `${author} (${year}). ${title}.`;
}

function formatIEEE(entry: BibEntry): string {
  const { fields } = entry;
  const author = fields.author?.replace(' and ', ', ') || 'Unknown';
  const title = fields.title || 'Untitled';
  const year = fields.year || 'n.d.';

  if (entry.type === 'article') {
    const journal = fields.journal || '';
    const volume = fields.volume || '';
    const pages = fields.pages || '';

    return `${author}, "${title}," *${journal}*, vol. ${volume}, pp. ${pages}, ${year}.`;
  }

  return `${author}, "${title}," ${year}.`;
}

function formatChicago(entry: BibEntry): string {
  const { fields } = entry;
  const author = fields.author || 'Unknown';
  const title = fields.title || 'Untitled';
  const year = fields.year || 'n.d.';

  if (entry.type === 'book') {
    const publisher = fields.publisher || '';
    const address = fields.address || '';

    return `${author}. *${title}*. ${address}: ${publisher}, ${year}.`;
  }

  return `${author}. "${title}." ${year}.`;
}

/**
 * Check for common bibliography issues.
 */
export function checkBibliographyQuality(entries: BibEntry[]): {
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let score = 100;

  // Check for entries with validation errors
  entries.forEach(entry => {
    const errors = validateEntry(entry);
    if (errors.length > 0) {
      issues.push(`${entry.key}: ${errors.join(', ')}`);
      score -= 5;
    }
  });

  // Check for inconsistent capitalization in titles
  const titleCapStyles = entries.map(e =>
    /^[A-Z]/.test(e.fields.title || '') ? 'capital' : 'lower'
  );
  const capitalCount = titleCapStyles.filter(s => s === 'capital').length;
  if (capitalCount > 0 && capitalCount < entries.length) {
    issues.push('Inconsistent title capitalization');
    score -= 10;
  }

  // Check for missing DOIs in recent articles
  const recentArticles = entries.filter(
    e => e.type === 'article' && parseInt(e.fields.year || '0', 10) >= 2010
  );
  const missingDOI = recentArticles.filter(e => !e.fields.doi).length;
  if (missingDOI > 0) {
    issues.push(`${missingDOI} recent articles missing DOI`);
    score -= missingDOI * 2;
  }

  return { issues, score: Math.max(0, score) };
}

/**
 * Export bibliography in different formats.
 */
export function exportBibliography(
  entries: BibEntry[],
  format: 'bibtex' | 'json' | 'csv'
): string {
  if (format === 'bibtex') {
    return entries.map(e => formatBibEntry(e)).join('\n\n');
  }

  if (format === 'json') {
    return JSON.stringify(entries, null, 2);
  }

  if (format === 'csv') {
    const headers = ['key', 'type', 'author', 'title', 'year', 'journal', 'publisher'];
    const rows = entries.map(e => {
      return headers.map(h => {
        if (h === 'key') return e.key;
        if (h === 'type') return e.type;
        return e.fields[h] || '';
      });
    });

    const csvLines = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];

    return csvLines.join('\n');
  }

  return '';
}
