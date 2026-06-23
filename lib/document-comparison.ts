/**
 * Document Comparison Utility
 *
 * Compare two versions of a document to identify changes in content, structure, and formatting
 */

export interface ComparisonResult {
  addedLines: string[];
  removedLines: string[];
  modifiedLines: { old: string; new: string; lineNumber: number }[];
  similarity: number; // 0 to 1
  statistics: {
    totalLines: number;
    unchangedLines: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

export interface StructuralComparison {
  addedSections: string[];
  removedSections: string[];
  reorderedSections: { section: string; oldIndex: number; newIndex: number }[];
}

/**
 * Compare two documents line by line
 */
export function compareDocuments(oldDoc: string, newDoc: string): ComparisonResult {
  const oldLines = oldDoc.split("\n");
  const newLines = newDoc.split("\n");

  const addedLines: string[] = [];
  const removedLines: string[] = [];
  const modifiedLines: { old: string; new: string; lineNumber: number }[] = [];

  // Simple line-by-line comparison (can be enhanced with LCS algorithm)
  const maxLines = Math.max(oldLines.length, newLines.length);
  let unchangedCount = 0;

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";

    if (oldLine === newLine) {
      unchangedCount++;
    } else if (!oldLine && newLine) {
      addedLines.push(newLine);
    } else if (oldLine && !newLine) {
      removedLines.push(oldLine);
    } else {
      modifiedLines.push({ old: oldLine, new: newLine, lineNumber: i + 1 });
    }
  }

  const totalLines = Math.max(oldLines.length, newLines.length);
  const similarity = totalLines > 0 ? unchangedCount / totalLines : 1;

  return {
    addedLines,
    removedLines,
    modifiedLines,
    similarity,
    statistics: {
      totalLines,
      unchangedLines: unchangedCount,
      addedCount: addedLines.length,
      removedCount: removedLines.length,
      modifiedCount: modifiedLines.length,
    },
  };
}

/**
 * Compare structural elements (sections, headings, etc.)
 */
export function compareStructure(
  oldDoc: string,
  newDoc: string
): StructuralComparison {
  const oldSections = extractSections(oldDoc);
  const newSections = extractSections(newDoc);

  const addedSections: string[] = [];
  const removedSections: string[] = [];
  const reorderedSections: { section: string; oldIndex: number; newIndex: number }[] = [];

  // Find added sections
  for (let i = 0; i < newSections.length; i++) {
    if (!oldSections.includes(newSections[i])) {
      addedSections.push(newSections[i]);
    }
  }

  // Find removed sections
  for (let i = 0; i < oldSections.length; i++) {
    if (!newSections.includes(oldSections[i])) {
      removedSections.push(oldSections[i]);
    }
  }

  // Find reordered sections
  for (const section of oldSections) {
    const oldIndex = oldSections.indexOf(section);
    const newIndex = newSections.indexOf(section);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      reorderedSections.push({ section, oldIndex, newIndex });
    }
  }

  return {
    addedSections,
    removedSections,
    reorderedSections,
  };
}

/**
 * Extract section headings from markdown or LaTeX
 */
function extractSections(doc: string): string[] {
  const sections: string[] = [];
  const lines = doc.split("\n");

  for (const line of lines) {
    // Markdown headings
    const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (mdMatch) {
      sections.push(mdMatch[2].trim());
      continue;
    }

    // LaTeX sections
    const latexMatch = line.match(/\\(section|subsection|subsubsection)\{([^}]+)\}/);
    if (latexMatch) {
      sections.push(latexMatch[2].trim());
    }
  }

  return sections;
}

/**
 * Calculate text similarity using Jaccard index
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Generate a human-readable comparison summary
 */
export function generateComparisonSummary(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push("=== Document Comparison Summary ===\n");
  lines.push(`Similarity: ${(result.similarity * 100).toFixed(1)}%\n`);
  lines.push(`Total Lines: ${result.statistics.totalLines}`);
  lines.push(`Unchanged: ${result.statistics.unchangedLines}`);
  lines.push(`Added: ${result.statistics.addedCount}`);
  lines.push(`Removed: ${result.statistics.removedCount}`);
  lines.push(`Modified: ${result.statistics.modifiedCount}\n`);

  if (result.addedLines.length > 0) {
    lines.push("\n--- Added Lines ---");
    result.addedLines.slice(0, 5).forEach((line) => {
      lines.push(`+ ${line}`);
    });
    if (result.addedLines.length > 5) {
      lines.push(`... and ${result.addedLines.length - 5} more`);
    }
  }

  if (result.removedLines.length > 0) {
    lines.push("\n--- Removed Lines ---");
    result.removedLines.slice(0, 5).forEach((line) => {
      lines.push(`- ${line}`);
    });
    if (result.removedLines.length > 5) {
      lines.push(`... and ${result.removedLines.length - 5} more`);
    }
  }

  if (result.modifiedLines.length > 0) {
    lines.push("\n--- Modified Lines ---");
    result.modifiedLines.slice(0, 5).forEach(({ old, new: newLine, lineNumber }) => {
      lines.push(`Line ${lineNumber}:`);
      lines.push(`  - ${old}`);
      lines.push(`  + ${newLine}`);
    });
    if (result.modifiedLines.length > 5) {
      lines.push(`... and ${result.modifiedLines.length - 5} more`);
    }
  }

  return lines.join("\n");
}

/**
 * Highlight differences in two text strings
 */
export function highlightDifferences(
  oldText: string,
  newText: string
): { old: string; new: string } {
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);

  let oldHighlighted = "";
  let newHighlighted = "";

  const maxLength = Math.max(oldWords.length, newWords.length);

  for (let i = 0; i < maxLength; i++) {
    const oldWord = oldWords[i] || "";
    const newWord = newWords[i] || "";

    if (oldWord !== newWord) {
      if (oldWord) {
        oldHighlighted += `<mark class="removed">${oldWord}</mark> `;
      }
      if (newWord) {
        newHighlighted += `<mark class="added">${newWord}</mark> `;
      }
    } else {
      oldHighlighted += `${oldWord} `;
      newHighlighted += `${newWord} `;
    }
  }

  return {
    old: oldHighlighted.trim(),
    new: newHighlighted.trim(),
  };
}

/**
 * Check if two documents are significantly different
 */
export function areDocumentsDifferent(
  oldDoc: string,
  newDoc: string,
  threshold: number = 0.1
): boolean {
  const similarity = calculateSimilarity(oldDoc, newDoc);
  return similarity < (1 - threshold);
}
