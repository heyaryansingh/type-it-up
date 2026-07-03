/**
 * Readability scoring for LaTeX/document content.
 *
 * Strips LaTeX markup down to plain prose, then scores the resulting text
 * using the Flesch Reading Ease and Flesch-Kincaid Grade Level formulas.
 * Useful for giving writers quick feedback on how accessible their prose is,
 * independent of the LaTeX source markup around it.
 */

export interface ReadabilityReport {
  fleschScore: number;
  gradeLevel: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  wordCount: number;
  sentenceCount: number;
  rating: ReadabilityRating;
}

export type ReadabilityRating =
  | "very easy"
  | "easy"
  | "standard"
  | "difficult"
  | "very difficult"
  | "academic";

/**
 * Remove common LaTeX commands, environments, and math delimiters from text,
 * leaving plain prose suitable for readability scoring.
 *
 * This is a heuristic strip, not a full LaTeX parser: it drops comments,
 * math mode content, common structural commands (\begin/\end/\label/\cite/
 * \ref/\section etc.), and command braces, while keeping the human-readable
 * text inside most commands (e.g. \textbf{hello} -> hello).
 */
export function stripLatexCommands(text: string): string {
  let result = text;

  // Strip line comments (unescaped %).
  result = result.replace(/(?<!\\)%.*$/gm, "");

  // Strip math mode: $$...$$, $...$, \[...\], \(...\).
  result = result.replace(/\$\$[\s\S]*?\$\$/g, " ");
  result = result.replace(/\$[^$]*\$/g, " ");
  result = result.replace(/\\\[[\s\S]*?\\\]/g, " ");
  result = result.replace(/\\\([\s\S]*?\\\)/g, " ");

  // Strip \begin{env}...\end{env} wrappers but keep inner content for
  // prose-bearing environments; drop the whole thing for known non-prose ones.
  const nonProseEnvironments = /\\begin\{(equation\*?|align\*?|figure|table|tikzpicture|verbatim|lstlisting)\}[\s\S]*?\\end\{\1\}/g;
  result = result.replace(nonProseEnvironments, " ");
  result = result.replace(/\\(begin|end)\{[^}]*\}/g, " ");

  // Strip commands that carry no readable text (labels, refs, citations).
  result = result.replace(/\\(label|ref|eqref|cite[a-zA-Z]*|includegraphics|input|include|usepackage|documentclass)\{[^}]*\}/g, " ");

  // Unwrap commands with a single text argument, keeping the argument text,
  // e.g. \textbf{hello} -> hello, \section{Intro} -> Intro.
  result = result.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?\{([^{}]*)\}/g, "$2");

  // Drop any remaining bare commands (no braces), e.g. \\, \noindent.
  result = result.replace(/\\[a-zA-Z]+\*?/g, " ");

  // Collapse leftover braces and whitespace.
  result = result.replace(/[{}]/g, " ");
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Count syllables in a single word using a vowel-group heuristic.
 * Not phonetically exact, but standard for Flesch-family formulas.
 */
export function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  if (normalized.length === 0) {
    return 0;
  }

  const vowelGroups = normalized.match(/[aeiouy]+/g) ?? [];
  let count = vowelGroups.length;

  // Silent trailing "e" (e.g. "make") typically doesn't add a syllable.
  if (normalized.endsWith("e") && !normalized.endsWith("le") && count > 1) {
    count -= 1;
  }

  return Math.max(count, 1);
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+(?:\s|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
}

/**
 * Compute the Flesch Reading Ease score (higher = easier to read).
 * Typical range is 0-100, though scores can fall outside it for unusual text.
 */
export function fleschReadingEase(text: string): number {
  const plain = stripLatexCommands(text);
  const sentences = splitSentences(plain);
  const words = splitWords(plain);

  if (words.length === 0 || sentences.length === 0) {
    return 0;
  }

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  return 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
}

/**
 * Compute the Flesch-Kincaid Grade Level (approximate US school grade
 * required to comprehend the text).
 */
export function fleschKincaidGradeLevel(text: string): number {
  const plain = stripLatexCommands(text);
  const sentences = splitSentences(plain);
  const words = splitWords(plain);

  if (words.length === 0 || sentences.length === 0) {
    return 0;
  }

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;

  return 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
}

function ratingFromFleschScore(score: number): ReadabilityRating {
  if (score >= 90) return "very easy";
  if (score >= 70) return "easy";
  if (score >= 50) return "standard";
  if (score >= 30) return "difficult";
  if (score >= 0) return "very difficult";
  return "academic";
}

/**
 * Produce a full readability report for a block of LaTeX/document text.
 *
 * Strips LaTeX markup once, then derives Flesch Reading Ease, Flesch-Kincaid
 * Grade Level, and supporting stats (word/sentence counts, averages) from
 * the resulting prose, plus a human-readable rating label.
 */
export function analyzeReadability(text: string): ReadabilityReport {
  const plain = stripLatexCommands(text);
  const sentences = splitSentences(plain);
  const words = splitWords(plain);

  if (words.length === 0 || sentences.length === 0) {
    return {
      fleschScore: 0,
      gradeLevel: 0,
      avgWordsPerSentence: 0,
      avgSyllablesPerWord: 0,
      wordCount: words.length,
      sentenceCount: sentences.length,
      rating: "academic",
    };
  }

  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  const fleschScore = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return {
    fleschScore,
    gradeLevel,
    avgWordsPerSentence,
    avgSyllablesPerWord,
    wordCount: words.length,
    sentenceCount: sentences.length,
    rating: ratingFromFleschScore(fleschScore),
  };
}
