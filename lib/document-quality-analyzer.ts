/**
 * Document Quality Analyzer
 *
 * Analyzes LaTeX documents for quality metrics including:
 * - Readability scores
 * - Structure completeness
 * - Citation quality
 * - Figure/table quality
 * - Consistency checks
 */

interface QualityMetrics {
  overall_score: number;
  readability: ReadabilityMetrics;
  structure: StructureMetrics;
  citations: CitationMetrics;
  figures: FigureMetrics;
  consistency: ConsistencyMetrics;
  recommendations: string[];
}

interface ReadabilityMetrics {
  score: number;
  avg_sentence_length: number;
  avg_word_length: number;
  complex_word_ratio: number;
  passive_voice_ratio: number;
}

interface StructureMetrics {
  score: number;
  has_abstract: boolean;
  has_introduction: boolean;
  has_conclusion: boolean;
  section_depth: number;
  avg_section_length: number;
}

interface CitationMetrics {
  score: number;
  total_citations: number;
  unique_sources: number;
  citation_density: number;
  has_bibliography: boolean;
  uncited_references: number;
}

interface FigureMetrics {
  score: number;
  total_figures: number;
  total_tables: number;
  captioned_figures: number;
  captioned_tables: number;
  referenced_figures: number;
}

interface ConsistencyMetrics {
  score: number;
  heading_consistency: boolean;
  spacing_consistency: boolean;
  citation_style_consistency: boolean;
  notation_consistency: boolean;
}

/**
 * Analyze document quality
 */
export function analyzeDocumentQuality(latexContent: string): QualityMetrics {
  const readability = analyzeReadability(latexContent);
  const structure = analyzeStructure(latexContent);
  const citations = analyzeCitations(latexContent);
  const figures = analyzeFigures(latexContent);
  const consistency = analyzeConsistency(latexContent);

  // Calculate overall score (weighted average)
  const overall_score =
    readability.score * 0.25 +
    structure.score * 0.25 +
    citations.score * 0.2 +
    figures.score * 0.15 +
    consistency.score * 0.15;

  const recommendations = generateRecommendations({
    readability,
    structure,
    citations,
    figures,
    consistency,
  });

  return {
    overall_score: Math.round(overall_score),
    readability,
    structure,
    citations,
    figures,
    consistency,
    recommendations,
  };
}

/**
 * Analyze readability metrics
 */
function analyzeReadability(content: string): ReadabilityMetrics {
  // Remove LaTeX commands for text analysis
  const textContent = content
    .replace(/\\[a-zA-Z]+(\{[^}]*\}|\[[^\]]*\])?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into sentences
  const sentences = textContent.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = textContent.split(/\s+/).filter((w) => w.length > 0);

  if (sentences.length === 0 || words.length === 0) {
    return {
      score: 0,
      avg_sentence_length: 0,
      avg_word_length: 0,
      complex_word_ratio: 0,
      passive_voice_ratio: 0,
    };
  }

  // Average sentence length
  const avg_sentence_length = words.length / sentences.length;

  // Average word length
  const total_chars = words.reduce((sum, word) => sum + word.length, 0);
  const avg_word_length = total_chars / words.length;

  // Complex words (>7 characters or >2 syllables)
  const complex_words = words.filter((word) => word.length > 7).length;
  const complex_word_ratio = complex_words / words.length;

  // Passive voice detection (simplified)
  const passive_indicators = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
  const passive_matches = (content.match(passive_indicators) || []).length;
  const passive_voice_ratio = passive_matches / sentences.length;

  // Calculate readability score (0-100, higher is better)
  // Penalize long sentences, long words, complex words, and passive voice
  let score = 100;
  if (avg_sentence_length > 25) score -= (avg_sentence_length - 25) * 2;
  if (avg_word_length > 6) score -= (avg_word_length - 6) * 5;
  score -= complex_word_ratio * 30;
  score -= passive_voice_ratio * 20;
  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    avg_sentence_length: Math.round(avg_sentence_length * 10) / 10,
    avg_word_length: Math.round(avg_word_length * 10) / 10,
    complex_word_ratio: Math.round(complex_word_ratio * 100) / 100,
    passive_voice_ratio: Math.round(passive_voice_ratio * 100) / 100,
  };
}

/**
 * Analyze document structure
 */
function analyzeStructure(content: string): StructureMetrics {
  const has_abstract = /\\begin\{abstract\}/i.test(content);
  const has_introduction = /\\section\*?\{.*?introduction.*?\}/i.test(content);
  const has_conclusion = /\\section\*?\{.*?(conclusion|summary).*?\}/i.test(content);

  // Count sections
  const sections = (content.match(/\\section\*?\{/g) || []).length;
  const subsections = (content.match(/\\subsection\*?\{/g) || []).length;
  const subsubsections = (content.match(/\\subsubsection\*?\{/g) || []).length;

  // Section depth
  let section_depth = 1;
  if (subsections > 0) section_depth = 2;
  if (subsubsections > 0) section_depth = 3;

  // Average section length (approximate)
  const section_splits = content.split(/\\section\*?\{/);
  const avg_section_length =
    section_splits.length > 1
      ? section_splits.reduce((sum, sec) => sum + sec.length, 0) / section_splits.length
      : 0;

  // Calculate structure score
  let score = 0;
  if (has_abstract) score += 25;
  if (has_introduction) score += 25;
  if (has_conclusion) score += 25;
  if (sections >= 3) score += 15;
  if (section_depth >= 2) score += 10;

  return {
    score: Math.round(score),
    has_abstract,
    has_introduction,
    has_conclusion,
    section_depth,
    avg_section_length: Math.round(avg_section_length),
  };
}

/**
 * Analyze citations
 */
function analyzeCitations(content: string): CitationMetrics {
  // Find all citations
  const cite_matches = content.match(/\\cite\{[^}]+\}/g) || [];
  const total_citations = cite_matches.length;

  // Extract unique cite keys
  const cite_keys = new Set<string>();
  cite_matches.forEach((match) => {
    const keys = match.replace(/\\cite\{|\}/g, '').split(',');
    keys.forEach((key) => cite_keys.add(key.trim()));
  });
  const unique_sources = cite_keys.size;

  // Check for bibliography
  const has_bibliography =
    /\\begin\{thebibliography\}/i.test(content) || /\\bibliography\{/i.test(content);

  // Find bibliography entries
  const bib_entries = (content.match(/\\bibitem\{[^}]+\}/g) || []).length;

  // Uncited references
  const uncited_references = Math.max(0, bib_entries - unique_sources);

  // Citation density (citations per 1000 words)
  const word_count = content.split(/\s+/).length;
  const citation_density = (total_citations / word_count) * 1000;

  // Calculate citation score
  let score = 0;
  if (has_bibliography) score += 40;
  if (total_citations >= 10) score += 30;
  else if (total_citations >= 5) score += 20;
  if (unique_sources >= 5) score += 20;
  if (uncited_references === 0) score += 10;

  return {
    score: Math.round(score),
    total_citations,
    unique_sources,
    citation_density: Math.round(citation_density * 10) / 10,
    has_bibliography,
    uncited_references,
  };
}

/**
 * Analyze figures and tables
 */
function analyzeFigures(content: string): FigureMetrics {
  // Count figures
  const figures = (content.match(/\\begin\{figure\}/g) || []).length;
  const tables = (content.match(/\\begin\{table\}/g) || []).length;

  // Count captions
  const figure_captions = (content.match(/\\begin\{figure\}[\s\S]*?\\caption\{/g) || []).length;
  const table_captions = (content.match(/\\begin\{table\}[\s\S]*?\\caption\{/g) || []).length;

  // Count figure references
  const figure_refs = new Set<string>();
  const ref_matches = content.match(/\\ref\{[^}]+\}/g) || [];
  ref_matches.forEach((match) => {
    const key = match.replace(/\\ref\{|\}/g, '');
    if (key.startsWith('fig:')) figure_refs.add(key);
  });
  const referenced_figures = figure_refs.size;

  // Calculate figure score
  let score = 100;
  if (figures > 0 && figure_captions < figures) {
    score -= ((figures - figure_captions) / figures) * 30;
  }
  if (tables > 0 && table_captions < tables) {
    score -= ((tables - table_captions) / tables) * 20;
  }
  if (figures > 0 && referenced_figures < figures) {
    score -= ((figures - referenced_figures) / figures) * 30;
  }
  if (figures === 0 && tables === 0) score = 50; // Neutral if no figures

  return {
    score: Math.round(Math.max(0, score)),
    total_figures: figures,
    total_tables: tables,
    captioned_figures: figure_captions,
    captioned_tables: table_captions,
    referenced_figures,
  };
}

/**
 * Analyze consistency
 */
function analyzeConsistency(content: string): ConsistencyMetrics {
  // Heading consistency (all sections use consistent capitalization)
  const section_headers = content.match(/\\section\*?\{([^}]+)\}/g) || [];
  const heading_styles = section_headers.map((header) => {
    const text = header.replace(/\\section\*?\{|\}/g, '');
    if (text === text.toUpperCase()) return 'upper';
    if (text === text.toLowerCase()) return 'lower';
    if (text[0] === text[0].toUpperCase()) return 'title';
    return 'mixed';
  });
  const heading_consistency =
    heading_styles.length === 0 ||
    heading_styles.every((style) => style === heading_styles[0]);

  // Spacing consistency (consistent use of \\ or blank lines)
  const double_backslashes = (content.match(/\\\\/g) || []).length;
  const blank_lines = (content.match(/\n\s*\n/g) || []).length;
  const spacing_consistency =
    (double_backslashes > 0 && blank_lines === 0) ||
    (double_backslashes === 0 && blank_lines > 0) ||
    (double_backslashes === 0 && blank_lines === 0);

  // Citation style consistency
  const cite_styles = new Set<string>();
  const cite_commands = content.match(/\\cite[a-z]*\{/gi) || [];
  cite_commands.forEach((cmd) => {
    const style = cmd.replace(/\{/g, '').toLowerCase();
    cite_styles.add(style);
  });
  const citation_style_consistency = cite_styles.size <= 1;

  // Notation consistency (consistent use of $ vs \[ \])
  const inline_math = (content.match(/\$[^$]+\$/g) || []).length;
  const display_math_bracket = (content.match(/\\\[[\s\S]*?\\\]/g) || []).length;
  const display_math_dollar = (content.match(/\$\$[\s\S]*?\$\$/g) || []).length;
  const notation_consistency =
    (display_math_bracket > 0 && display_math_dollar === 0) ||
    (display_math_bracket === 0 && display_math_dollar > 0) ||
    (display_math_bracket === 0 && display_math_dollar === 0);

  // Calculate consistency score
  let score = 0;
  if (heading_consistency) score += 25;
  if (spacing_consistency) score += 25;
  if (citation_style_consistency) score += 25;
  if (notation_consistency) score += 25;

  return {
    score,
    heading_consistency,
    spacing_consistency,
    citation_style_consistency,
    notation_consistency,
  };
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(metrics: {
  readability: ReadabilityMetrics;
  structure: StructureMetrics;
  citations: CitationMetrics;
  figures: FigureMetrics;
  consistency: ConsistencyMetrics;
}): string[] {
  const recommendations: string[] = [];

  // Readability
  if (metrics.readability.score < 60) {
    if (metrics.readability.avg_sentence_length > 25) {
      recommendations.push('Consider breaking long sentences into shorter ones for better readability.');
    }
    if (metrics.readability.complex_word_ratio > 0.3) {
      recommendations.push('Simplify complex vocabulary where possible to improve accessibility.');
    }
    if (metrics.readability.passive_voice_ratio > 0.2) {
      recommendations.push('Reduce passive voice usage - prefer active constructions.');
    }
  }

  // Structure
  if (!metrics.structure.has_abstract) {
    recommendations.push('Add an abstract to summarize your document.');
  }
  if (!metrics.structure.has_introduction) {
    recommendations.push('Include a clear introduction section.');
  }
  if (!metrics.structure.has_conclusion) {
    recommendations.push('Add a conclusion to wrap up your arguments.');
  }

  // Citations
  if (!metrics.citations.has_bibliography) {
    recommendations.push('Add a bibliography section to cite your sources.');
  }
  if (metrics.citations.total_citations < 5) {
    recommendations.push('Consider adding more citations to support your claims.');
  }
  if (metrics.citations.uncited_references > 0) {
    recommendations.push(
      `Remove ${metrics.citations.uncited_references} unused bibliography entries or cite them in text.`
    );
  }

  // Figures
  if (metrics.figures.total_figures > 0) {
    const uncaptioned = metrics.figures.total_figures - metrics.figures.captioned_figures;
    if (uncaptioned > 0) {
      recommendations.push(`Add captions to ${uncaptioned} figures.`);
    }
    const unreferenced = metrics.figures.total_figures - metrics.figures.referenced_figures;
    if (unreferenced > 0) {
      recommendations.push(`Reference ${unreferenced} figures in the text using \\ref{}.`);
    }
  }

  // Consistency
  if (!metrics.consistency.heading_consistency) {
    recommendations.push('Use consistent capitalization style in all section headings.');
  }
  if (!metrics.consistency.citation_style_consistency) {
    recommendations.push('Use a consistent citation command style throughout (e.g., always \\cite or \\citep).');
  }
  if (!metrics.consistency.notation_consistency) {
    recommendations.push('Use consistent math notation (either $ $ or \\[ \\] for display math).');
  }

  return recommendations;
}

/**
 * Generate quality report as formatted string
 */
export function formatQualityReport(metrics: QualityMetrics): string {
  let report = `Document Quality Report\n`;
  report += `${'='.repeat(50)}\n\n`;

  report += `Overall Score: ${metrics.overall_score}/100\n\n`;

  report += `Readability: ${metrics.readability.score}/100\n`;
  report += `  - Avg Sentence Length: ${metrics.readability.avg_sentence_length} words\n`;
  report += `  - Avg Word Length: ${metrics.readability.avg_word_length} characters\n`;
  report += `  - Complex Word Ratio: ${(metrics.readability.complex_word_ratio * 100).toFixed(1)}%\n`;
  report += `  - Passive Voice Ratio: ${(metrics.readability.passive_voice_ratio * 100).toFixed(1)}%\n\n`;

  report += `Structure: ${metrics.structure.score}/100\n`;
  report += `  - Abstract: ${metrics.structure.has_abstract ? '✓' : '✗'}\n`;
  report += `  - Introduction: ${metrics.structure.has_introduction ? '✓' : '✗'}\n`;
  report += `  - Conclusion: ${metrics.structure.has_conclusion ? '✓' : '✗'}\n`;
  report += `  - Section Depth: ${metrics.structure.section_depth}\n\n`;

  report += `Citations: ${metrics.citations.score}/100\n`;
  report += `  - Total Citations: ${metrics.citations.total_citations}\n`;
  report += `  - Unique Sources: ${metrics.citations.unique_sources}\n`;
  report += `  - Citation Density: ${metrics.citations.citation_density} per 1000 words\n`;
  report += `  - Bibliography: ${metrics.citations.has_bibliography ? '✓' : '✗'}\n\n`;

  report += `Figures & Tables: ${metrics.figures.score}/100\n`;
  report += `  - Total Figures: ${metrics.figures.total_figures} (${metrics.figures.captioned_figures} captioned)\n`;
  report += `  - Total Tables: ${metrics.figures.total_tables} (${metrics.figures.captioned_tables} captioned)\n`;
  report += `  - Referenced Figures: ${metrics.figures.referenced_figures}/${metrics.figures.total_figures}\n\n`;

  report += `Consistency: ${metrics.consistency.score}/100\n`;
  report += `  - Heading Style: ${metrics.consistency.heading_consistency ? '✓' : '✗'}\n`;
  report += `  - Spacing Style: ${metrics.consistency.spacing_consistency ? '✓' : '✗'}\n`;
  report += `  - Citation Style: ${metrics.consistency.citation_style_consistency ? '✓' : '✗'}\n`;
  report += `  - Math Notation: ${metrics.consistency.notation_consistency ? '✓' : '✗'}\n\n`;

  if (metrics.recommendations.length > 0) {
    report += `Recommendations:\n`;
    metrics.recommendations.forEach((rec, i) => {
      report += `  ${i + 1}. ${rec}\n`;
    });
  }

  return report;
}
