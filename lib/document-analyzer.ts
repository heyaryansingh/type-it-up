/**
 * @fileoverview Document Content Analyzer - Extract metadata and statistics
 * @module lib/document-analyzer
 *
 * Analyzes document content to extract:
 * - Reading time estimates
 * - Complexity metrics (equations, technical terms)
 * - Structure analysis (sections, lists, tables)
 * - Language detection and readability scores
 *
 * @example
 * ```typescript
 * import { analyzeDocumentContent } from './document-analyzer';
 *
 * const analysis = analyzeDocumentContent(document);
 * console.log(`Reading time: ${analysis.readingTime} minutes`);
 * ```
 */

import type { DocumentJSON } from "./types";

export interface DocumentAnalysis {
  // Content metrics
  wordCount: number;
  characterCount: number;
  sentenceCount: number;
  paragraphCount: number;
  pageCount: number;

  // Reading time (minutes)
  readingTime: number;

  // Complexity metrics
  complexityScore: number; // 0-1 scale
  mathEquationCount: number;
  technicalTermCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;

  // Structure
  headingCount: number;
  listCount: number;
  tableCount: number;
  imageCount: number;
  linkCount: number;

  // Readability
  fleschReadingEase?: number; // 0-100 (higher = easier)
  fleschKincaidGrade?: number; // US grade level

  // Language
  detectedLanguage: string;
  languageConfidence: number;

  // Content type classification
  contentType: "academic" | "technical" | "general" | "creative" | "unknown";
  contentTypeConfidence: number;
}

// Average reading speeds (words per minute)
const READING_SPEEDS = {
  general: 200,
  technical: 150,
  academic: 100,
  complex: 80,
};

/**
 * Analyze document content and extract comprehensive metadata
 */
export function analyzeDocumentContent(
  document: DocumentJSON
): DocumentAnalysis {
  const fullText = extractFullText(document);

  // Basic counts
  const wordCount = countWords(fullText);
  const characterCount = fullText.length;
  const sentences = splitSentences(fullText);
  const sentenceCount = sentences.length;
  const paragraphs = splitParagraphs(fullText);
  const paragraphCount = paragraphs.length;
  const pageCount = document.pages.length;

  // Math and technical content
  const mathEquationCount = countMathEquations(fullText);
  const technicalTermCount = countTechnicalTerms(fullText);

  // Structure elements
  const headingCount = countHeadings(fullText);
  const listCount = countLists(fullText);
  const tableCount = countTables(fullText);
  const imageCount = countImages(document);
  const linkCount = countLinks(fullText);

  // Averages
  const avgWordsPerSentence =
    sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const avgSentencesPerParagraph =
    paragraphCount > 0 ? sentenceCount / paragraphCount : 0;

  // Complexity score (0-1)
  const complexityScore = calculateComplexityScore({
    mathEquationCount,
    technicalTermCount,
    avgWordsPerSentence,
    wordCount,
  });

  // Reading time
  const readingTime = estimateReadingTime(
    wordCount,
    mathEquationCount,
    complexityScore
  );

  // Readability metrics
  const { fleschReadingEase, fleschKincaidGrade } =
    calculateReadability(sentences, wordCount);

  // Language detection
  const { language: detectedLanguage, confidence: languageConfidence } =
    detectLanguage(fullText);

  // Content type classification
  const { type: contentType, confidence: contentTypeConfidence } =
    classifyContentType({
      mathEquationCount,
      technicalTermCount,
      headingCount,
      complexityScore,
      wordCount,
    });

  return {
    wordCount,
    characterCount,
    sentenceCount,
    paragraphCount,
    pageCount,
    readingTime,
    complexityScore,
    mathEquationCount,
    technicalTermCount,
    avgWordsPerSentence,
    avgSentencesPerParagraph,
    headingCount,
    listCount,
    tableCount,
    imageCount,
    linkCount,
    fleschReadingEase,
    fleschKincaidGrade,
    detectedLanguage,
    languageConfidence,
    contentType,
    contentTypeConfidence,
  };
}

/**
 * Extract all text from document
 */
function extractFullText(document: DocumentJSON): string {
  return document.pages
    .flatMap((page) => page.regions.map((region) => region.content.text))
    .join("\n\n");
}

/**
 * Count words (split by whitespace)
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split text into sentences
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Split text into paragraphs
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Count math equations (LaTeX markers or math symbols)
 */
function countMathEquations(text: string): number {
  const latexMatchers = [
    /\$\$[\s\S]*?\$\$/g, // Display math
    /\$[^$]+\$/g, // Inline math
    /\\begin\{equation\}/g,
    /\\begin\{align\}/g,
    /\\frac\{/g,
    /\\sum/g,
    /\\int/g,
  ];

  let count = 0;
  for (const regex of latexMatchers) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Count technical terms (heuristic)
 */
function countTechnicalTerms(text: string): number {
  const technicalPatterns = [
    /\b[A-Z]{2,}\b/g, // Acronyms (e.g., API, HTTP)
    /\b\w+[_-]\w+\b/g, // Snake/kebab case (e.g., data_type, http-request)
    /\b\w+\(\)/g, // Function calls (e.g., getData())
    /\b0x[0-9a-fA-F]+\b/g, // Hex numbers
  ];

  let count = 0;
  for (const regex of technicalPatterns) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Count headings (markdown or LaTeX)
 */
function countHeadings(text: string): number {
  const headingPatterns = [
    /^#{1,6}\s/gm, // Markdown headings
    /\\section\{/g,
    /\\subsection\{/g,
    /\\chapter\{/g,
  ];

  let count = 0;
  for (const regex of headingPatterns) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Count lists (markdown or LaTeX)
 */
function countLists(text: string): number {
  const listPatterns = [
    /^\s*[-*+]\s/gm, // Unordered lists
    /^\s*\d+\.\s/gm, // Ordered lists
    /\\begin\{itemize\}/g,
    /\\begin\{enumerate\}/g,
  ];

  let count = 0;
  for (const regex of listPatterns) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Count tables
 */
function countTables(text: string): number {
  const tablePatterns = [/\\begin\{tabular\}/g, /\|.*\|.*\|/g];

  let count = 0;
  for (const regex of tablePatterns) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Count images in document
 */
function countImages(document: DocumentJSON): number {
  return document.pages.reduce(
    (count, page) =>
      count +
      page.regions.filter(
        (region) => region.type === "image" || region.type === "diagram"
      ).length,
    0
  );
}

/**
 * Count links (markdown or LaTeX)
 */
function countLinks(text: string): number {
  const linkPatterns = [
    /\[.*?\]\(.*?\)/g, // Markdown links
    /https?:\/\/\S+/g, // URLs
    /\\url\{/g,
    /\\href\{/g,
  ];

  let count = 0;
  for (const regex of linkPatterns) {
    const matches = text.match(regex);
    count += matches ? matches.length : 0;
  }

  return count;
}

/**
 * Calculate complexity score (0-1)
 */
function calculateComplexityScore(params: {
  mathEquationCount: number;
  technicalTermCount: number;
  avgWordsPerSentence: number;
  wordCount: number;
}): number {
  const mathDensity = params.wordCount > 0 ? params.mathEquationCount / params.wordCount : 0;
  const techDensity = params.wordCount > 0 ? params.technicalTermCount / params.wordCount : 0;
  const sentenceLengthScore = Math.min(params.avgWordsPerSentence / 30, 1);

  return Math.min(mathDensity * 10 + techDensity * 5 + sentenceLengthScore * 0.3, 1);
}

/**
 * Estimate reading time in minutes
 */
function estimateReadingTime(
  wordCount: number,
  mathEquationCount: number,
  complexityScore: number
): number {
  // Base reading speed
  let speed = READING_SPEEDS.general;

  if (complexityScore > 0.7) {
    speed = READING_SPEEDS.complex;
  } else if (complexityScore > 0.5) {
    speed = READING_SPEEDS.academic;
  } else if (complexityScore > 0.3) {
    speed = READING_SPEEDS.technical;
  }

  // Add time for math equations (assume 30 seconds per equation)
  const mathTime = (mathEquationCount * 0.5);

  return Math.ceil(wordCount / speed + mathTime);
}

/**
 * Calculate Flesch readability metrics
 */
function calculateReadability(
  sentences: string[],
  wordCount: number
): { fleschReadingEase?: number; fleschKincaidGrade?: number } {
  if (sentences.length === 0 || wordCount === 0) {
    return {};
  }

  const syllableCount = sentences.reduce(
    (count, sentence) => count + countSyllables(sentence),
    0
  );

  const avgSentenceLength = wordCount / sentences.length;
  const avgSyllablesPerWord = syllableCount / wordCount;

  // Flesch Reading Ease: 206.835 - 1.015(words/sentence) - 84.6(syllables/word)
  const fleschReadingEase = Math.max(
    0,
    Math.min(
      100,
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord
    )
  );

  // Flesch-Kincaid Grade Level: 0.39(words/sentence) + 11.8(syllables/word) - 15.59
  const fleschKincaidGrade = Math.max(
    0,
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
  );

  return { fleschReadingEase, fleschKincaidGrade };
}

/**
 * Count syllables in text (simple heuristic)
 */
function countSyllables(text: string): number {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  return words.reduce((count, word) => {
    // Count vowel groups
    const vowelGroups = word.match(/[aeiouy]+/g);
    let syllables = vowelGroups ? vowelGroups.length : 1;

    // Adjust for silent 'e'
    if (word.endsWith("e")) {
      syllables = Math.max(1, syllables - 1);
    }

    return count + syllables;
  }, 0);
}

/**
 * Detect language (simple heuristic)
 */
function detectLanguage(text: string): {
  language: string;
  confidence: number;
} {
  // Very basic language detection (can be improved with libraries)
  const sample = text.slice(0, 500).toLowerCase();

  const patterns = [
    { lang: "en", regex: /\b(the|and|is|in|to|of|a|that|it|with)\b/g },
    { lang: "es", regex: /\b(el|la|de|que|y|en|un|es|por|para)\b/g },
    { lang: "fr", regex: /\b(le|de|la|et|un|une|est|dans|les|pour)\b/g },
    { lang: "de", regex: /\b(der|die|das|und|in|den|von|ist|mit|zu)\b/g },
  ];

  let maxMatches = 0;
  let detectedLang = "en";

  for (const { lang, regex } of patterns) {
    const matches = sample.match(regex);
    const matchCount = matches ? matches.length : 0;

    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      detectedLang = lang;
    }
  }

  const confidence = Math.min(maxMatches / 20, 1);
  return { language: detectedLang, confidence };
}

/**
 * Classify content type
 */
function classifyContentType(params: {
  mathEquationCount: number;
  technicalTermCount: number;
  headingCount: number;
  complexityScore: number;
  wordCount: number;
}): {
  type: "academic" | "technical" | "general" | "creative" | "unknown";
  confidence: number;
} {
  const mathDensity = params.wordCount > 0 ? params.mathEquationCount / params.wordCount : 0;
  const techDensity = params.wordCount > 0 ? params.technicalTermCount / params.wordCount : 0;

  if (mathDensity > 0.02 && params.headingCount > 2) {
    return { type: "academic", confidence: 0.8 };
  }

  if (techDensity > 0.05 || params.complexityScore > 0.6) {
    return { type: "technical", confidence: 0.7 };
  }

  if (params.complexityScore < 0.3 && params.headingCount < 3) {
    return { type: "creative", confidence: 0.6 };
  }

  if (params.wordCount > 100) {
    return { type: "general", confidence: 0.5 };
  }

  return { type: "unknown", confidence: 0.3 };
}
