/**
 * Citation formatting utilities for academic documents.
 *
 * Supports multiple citation styles including APA, MLA, Chicago, IEEE, and Harvard.
 * Provides parsing, formatting, and validation for bibliographic references.
 *
 * @fileoverview Citation formatter for academic document processing
 * @module lib/citation-formatter
 *
 * @example
 * ```typescript
 * import { formatCitation, parseCitation } from './citation-formatter';
 *
 * const citation = parseCitation('Smith, J. (2024). Title. Journal, 1(1), 1-10.');
 * const formatted = formatCitation(citation, 'mla');
 * ```
 */

/**
 * Supported citation styles.
 */
export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';

/**
 * Type of source being cited.
 */
export type SourceType =
  | 'journal'
  | 'book'
  | 'chapter'
  | 'website'
  | 'conference'
  | 'thesis'
  | 'report';

/**
 * Author information structure.
 */
export interface Author {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
}

/**
 * Complete citation data structure.
 */
export interface Citation {
  id?: string;
  type: SourceType;
  authors: Author[];
  title: string;
  year: number | string;
  journal?: string;
  volume?: string | number;
  issue?: string | number;
  pages?: string;
  publisher?: string;
  location?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  edition?: string | number;
  editors?: Author[];
  bookTitle?: string;
  conference?: string;
  institution?: string;
}

/**
 * Format a single author name according to citation style.
 *
 * @param author - Author information
 * @param style - Citation style
 * @param position - Position in author list (affects formatting)
 * @returns Formatted author name
 */
export function formatAuthorName(
  author: Author,
  style: CitationStyle,
  position: 'first' | 'subsequent' = 'first'
): string {
  const { firstName, lastName, middleName, suffix } = author;

  switch (style) {
    case 'apa':
      // APA: LastName, F. M.
      const apaInitials = middleName
        ? `${firstName.charAt(0)}. ${middleName.charAt(0)}.`
        : `${firstName.charAt(0)}.`;
      return suffix
        ? `${lastName}, ${apaInitials}, ${suffix}`
        : `${lastName}, ${apaInitials}`;

    case 'mla':
      // MLA: First author "LastName, FirstName" others "FirstName LastName"
      if (position === 'first') {
        return middleName
          ? `${lastName}, ${firstName} ${middleName}`
          : `${lastName}, ${firstName}`;
      }
      return middleName
        ? `${firstName} ${middleName} ${lastName}`
        : `${firstName} ${lastName}`;

    case 'chicago':
      // Chicago: LastName, FirstName MiddleName
      return middleName
        ? `${lastName}, ${firstName} ${middleName}`
        : `${lastName}, ${firstName}`;

    case 'ieee':
      // IEEE: F. M. LastName
      const ieeeInitials = middleName
        ? `${firstName.charAt(0)}. ${middleName.charAt(0)}.`
        : `${firstName.charAt(0)}.`;
      return `${ieeeInitials} ${lastName}`;

    case 'harvard':
      // Harvard: LastName, F.M.
      const harvardInitials = middleName
        ? `${firstName.charAt(0)}.${middleName.charAt(0)}.`
        : `${firstName.charAt(0)}.`;
      return `${lastName}, ${harvardInitials}`;

    default:
      return `${lastName}, ${firstName}`;
  }
}

/**
 * Format author list according to citation style.
 *
 * @param authors - Array of authors
 * @param style - Citation style
 * @returns Formatted author string
 */
export function formatAuthors(authors: Author[], style: CitationStyle): string {
  if (authors.length === 0) return '';

  if (authors.length === 1) {
    return formatAuthorName(authors[0], style, 'first');
  }

  if (authors.length === 2) {
    const first = formatAuthorName(authors[0], style, 'first');
    const second = formatAuthorName(authors[1], style, 'subsequent');

    switch (style) {
      case 'apa':
        return `${first}, & ${second}`;
      case 'mla':
        return `${first}, and ${second}`;
      case 'ieee':
        return `${first} and ${second}`;
      default:
        return `${first} and ${second}`;
    }
  }

  // Three or more authors
  const allAuthors = authors.map((a, i) =>
    formatAuthorName(a, style, i === 0 ? 'first' : 'subsequent')
  );

  switch (style) {
    case 'apa':
      if (authors.length > 20) {
        // APA 7: First 19, ..., last author
        return [...allAuthors.slice(0, 19), '...', allAuthors[allAuthors.length - 1]].join(', ');
      }
      return allAuthors.slice(0, -1).join(', ') + ', & ' + allAuthors[allAuthors.length - 1];

    case 'mla':
      // MLA: First author, et al. for 3+
      return `${allAuthors[0]}, et al.`;

    case 'chicago':
      if (authors.length > 10) {
        return allAuthors.slice(0, 7).join(', ') + ', et al.';
      }
      return allAuthors.slice(0, -1).join(', ') + ', and ' + allAuthors[allAuthors.length - 1];

    case 'ieee':
      if (authors.length > 6) {
        return allAuthors.slice(0, 1).join(', ') + ' et al.';
      }
      return allAuthors.slice(0, -1).join(', ') + ', and ' + allAuthors[allAuthors.length - 1];

    case 'harvard':
      if (authors.length > 3) {
        return `${allAuthors[0]} et al.`;
      }
      return allAuthors.slice(0, -1).join(', ') + ' and ' + allAuthors[allAuthors.length - 1];

    default:
      return allAuthors.join(', ');
  }
}

/**
 * Format a complete citation according to the specified style.
 *
 * @param citation - Citation data
 * @param style - Target citation style
 * @returns Formatted citation string
 */
export function formatCitation(citation: Citation, style: CitationStyle): string {
  const authors = formatAuthors(citation.authors, style);
  const { title, year, journal, volume, issue, pages, publisher, location, doi, url } = citation;

  switch (style) {
    case 'apa':
      return formatAPA(citation, authors);
    case 'mla':
      return formatMLA(citation, authors);
    case 'chicago':
      return formatChicago(citation, authors);
    case 'ieee':
      return formatIEEE(citation, authors);
    case 'harvard':
      return formatHarvard(citation, authors);
    default:
      return formatAPA(citation, authors);
  }
}

function formatAPA(citation: Citation, authors: string): string {
  const { title, year, journal, volume, issue, pages, publisher, location, doi, url, type } =
    citation;

  let result = `${authors} (${year}). `;

  switch (type) {
    case 'journal':
      result += `${title}. `;
      if (journal) result += `*${journal}*`;
      if (volume) result += `, *${volume}*`;
      if (issue) result += `(${issue})`;
      if (pages) result += `, ${pages}`;
      result += '.';
      break;

    case 'book':
      result += `*${title}*`;
      if (citation.edition) result += ` (${citation.edition} ed.)`;
      result += '. ';
      if (publisher) result += publisher;
      result += '.';
      break;

    case 'website':
      result += `${title}. `;
      if (url) result += url;
      break;

    default:
      result += `${title}.`;
  }

  if (doi) result += ` https://doi.org/${doi}`;

  return result;
}

function formatMLA(citation: Citation, authors: string): string {
  const { title, year, journal, volume, issue, pages, publisher, type } = citation;

  let result = `${authors}. `;

  switch (type) {
    case 'journal':
      result += `"${title}." `;
      if (journal) result += `*${journal}*`;
      if (volume) result += `, vol. ${volume}`;
      if (issue) result += `, no. ${issue}`;
      result += `, ${year}`;
      if (pages) result += `, pp. ${pages}`;
      result += '.';
      break;

    case 'book':
      result += `*${title}*. `;
      if (publisher) result += `${publisher}, `;
      result += `${year}.`;
      break;

    default:
      result += `"${title}." ${year}.`;
  }

  return result;
}

function formatChicago(citation: Citation, authors: string): string {
  const { title, year, journal, volume, pages, publisher, location, type } = citation;

  let result = `${authors}. `;

  switch (type) {
    case 'journal':
      result += `"${title}." `;
      if (journal) result += `*${journal}* `;
      if (volume) result += `${volume} `;
      result += `(${year})`;
      if (pages) result += `: ${pages}`;
      result += '.';
      break;

    case 'book':
      result += `*${title}*. `;
      if (location) result += `${location}: `;
      if (publisher) result += `${publisher}, `;
      result += `${year}.`;
      break;

    default:
      result += `"${title}." ${year}.`;
  }

  return result;
}

function formatIEEE(citation: Citation, authors: string): string {
  const { title, year, journal, volume, issue, pages, publisher, type } = citation;

  let result = `${authors}, `;

  switch (type) {
    case 'journal':
      result += `"${title}," `;
      if (journal) result += `*${journal}*`;
      if (volume) result += `, vol. ${volume}`;
      if (issue) result += `, no. ${issue}`;
      if (pages) result += `, pp. ${pages}`;
      result += `, ${year}.`;
      break;

    case 'book':
      result += `*${title}*. `;
      if (publisher) result += `${publisher}, `;
      result += `${year}.`;
      break;

    default:
      result += `"${title}," ${year}.`;
  }

  return result;
}

function formatHarvard(citation: Citation, authors: string): string {
  const { title, year, journal, volume, issue, pages, publisher, location, type } = citation;

  let result = `${authors} (${year}) `;

  switch (type) {
    case 'journal':
      result += `'${title}', `;
      if (journal) result += `*${journal}*`;
      if (volume) result += `, ${volume}`;
      if (issue) result += `(${issue})`;
      if (pages) result += `, pp. ${pages}`;
      result += '.';
      break;

    case 'book':
      result += `*${title}*. `;
      if (location) result += `${location}: `;
      if (publisher) result += publisher;
      result += '.';
      break;

    default:
      result += `'${title}'.`;
  }

  return result;
}

/**
 * Parse a raw citation string into structured data.
 *
 * @param raw - Raw citation text
 * @returns Parsed citation or null if parsing fails
 */
export function parseCitation(raw: string): Citation | null {
  // Try to extract basic components using regex patterns

  // Author pattern: "LastName, F." or "LastName, FirstName"
  const authorPattern = /^([A-Z][a-z]+(?:-[A-Z][a-z]+)?),\s*([A-Z]\.?(?:\s*[A-Z]\.?)?|[A-Za-z]+)/;

  // Year pattern: (YYYY) or YYYY
  const yearPattern = /\((\d{4})\)|(?:^|\s)(\d{4})(?:\s|$|\.)/;

  // Extract year
  const yearMatch = raw.match(yearPattern);
  const year = yearMatch ? yearMatch[1] || yearMatch[2] : 'n.d.';

  // Try to extract authors (simplified - first author only)
  const authorMatch = raw.match(authorPattern);
  let authors: Author[] = [];

  if (authorMatch) {
    const lastName = authorMatch[1];
    const firstPart = authorMatch[2];
    const firstName = firstPart.includes('.')
      ? firstPart.replace(/\./g, '').trim().split(' ')[0]
      : firstPart;

    authors = [{ firstName, lastName }];
  }

  // Extract title (text in quotes or italics, or between author/year and journal)
  let title = 'Unknown Title';
  const titleQuotesMatch = raw.match(/"([^"]+)"/);
  const titleItalicsMatch = raw.match(/\*([^*]+)\*/);

  if (titleQuotesMatch) {
    title = titleQuotesMatch[1];
  } else if (titleItalicsMatch) {
    title = titleItalicsMatch[1];
  }

  // Determine type based on content
  let type: SourceType = 'journal';
  if (raw.includes('http') || raw.includes('www.')) {
    type = 'website';
  } else if (raw.match(/\d+\s*\(\d+\)/)) {
    type = 'journal';
  } else if (raw.includes('Press') || raw.includes('Publisher')) {
    type = 'book';
  }

  // Extract journal info
  const volumeMatch = raw.match(/vol\.?\s*(\d+)|,\s*(\d+)\s*\(/i);
  const issueMatch = raw.match(/no\.?\s*(\d+)|\((\d+)\)/i);
  const pagesMatch = raw.match(/pp?\.?\s*(\d+[-–]\d+)/i);

  return {
    type,
    authors,
    title,
    year,
    volume: volumeMatch ? volumeMatch[1] || volumeMatch[2] : undefined,
    issue: issueMatch ? issueMatch[1] || issueMatch[2] : undefined,
    pages: pagesMatch ? pagesMatch[1] : undefined,
  };
}

/**
 * Convert between citation styles.
 *
 * @param citation - Source citation
 * @param fromStyle - Current style
 * @param toStyle - Target style
 * @returns Reformatted citation string
 */
export function convertCitationStyle(
  citation: Citation,
  fromStyle: CitationStyle,
  toStyle: CitationStyle
): string {
  return formatCitation(citation, toStyle);
}

/**
 * Validate a citation for completeness.
 *
 * @param citation - Citation to validate
 * @returns Object with isValid and missing fields
 */
export function validateCitation(citation: Citation): {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
} {
  const missingFields: string[] = [];
  const warnings: string[] = [];

  // Required fields for all types
  if (citation.authors.length === 0) {
    missingFields.push('authors');
  }
  if (!citation.title || citation.title === 'Unknown Title') {
    missingFields.push('title');
  }
  if (!citation.year) {
    missingFields.push('year');
  }

  // Type-specific validation
  switch (citation.type) {
    case 'journal':
      if (!citation.journal) missingFields.push('journal');
      if (!citation.volume) warnings.push('volume recommended for journal articles');
      if (!citation.pages) warnings.push('page numbers recommended for journal articles');
      break;

    case 'book':
      if (!citation.publisher) missingFields.push('publisher');
      break;

    case 'website':
      if (!citation.url) missingFields.push('url');
      if (!citation.accessDate) warnings.push('access date recommended for websites');
      break;
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    warnings,
  };
}

/**
 * Generate a BibTeX entry from citation data.
 *
 * @param citation - Citation to convert
 * @param key - BibTeX citation key
 * @returns BibTeX formatted string
 */
export function toBibTeX(citation: Citation, key?: string): string {
  const citationKey =
    key ||
    `${citation.authors[0]?.lastName || 'unknown'}${citation.year}`.toLowerCase().replace(/\s/g, '');

  const bibType = {
    journal: 'article',
    book: 'book',
    chapter: 'incollection',
    website: 'misc',
    conference: 'inproceedings',
    thesis: 'phdthesis',
    report: 'techreport',
  }[citation.type];

  const lines: string[] = [`@${bibType}{${citationKey},`];

  // Authors
  const authorStr = citation.authors
    .map((a) => `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`)
    .join(' and ');
  lines.push(`  author = {${authorStr}},`);

  lines.push(`  title = {${citation.title}},`);
  lines.push(`  year = {${citation.year}},`);

  if (citation.journal) lines.push(`  journal = {${citation.journal}},`);
  if (citation.volume) lines.push(`  volume = {${citation.volume}},`);
  if (citation.issue) lines.push(`  number = {${citation.issue}},`);
  if (citation.pages) lines.push(`  pages = {${citation.pages}},`);
  if (citation.publisher) lines.push(`  publisher = {${citation.publisher}},`);
  if (citation.doi) lines.push(`  doi = {${citation.doi}},`);
  if (citation.url) lines.push(`  url = {${citation.url}},`);

  // Remove trailing comma from last entry
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push('}');

  return lines.join('\n');
}
