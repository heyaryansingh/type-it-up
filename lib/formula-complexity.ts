/**
 * Formula Complexity Analyzer
 *
 * Analyzes the complexity of mathematical formulas to:
 * - Estimate rendering difficulty
 * - Suggest optimal export formats
 * - Identify potential OCR challenges
 * - Provide readability metrics
 */

export interface ComplexityMetrics {
  score: number; // 0-100, higher = more complex
  level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  factors: {
    nestedDepth: number;
    operatorCount: number;
    specialSymbols: number;
    matrixDimensions?: { rows: number; cols: number };
    integralCount: number;
    derivativeCount: number;
    sumProductCount: number;
    fractionDepth: number;
  };
  recommendations: string[];
  estimatedRenderTime: number; // milliseconds
}

export interface FormulaFeatures {
  hasMatrices: boolean;
  hasIntegrals: boolean;
  hasDerivatives: boolean;
  hasSummations: boolean;
  hasProducts: boolean;
  hasRoots: boolean;
  hasFractions: boolean;
  hasSubscripts: boolean;
  hasSuperscripts: boolean;
  hasGreekLetters: boolean;
  hasAccents: boolean;
  hasDelimiters: boolean;
}

/**
 * Analyze formula complexity from LaTeX string
 */
export function analyzeFormulaComplexity(latex: string): ComplexityMetrics {
  const features = extractFeatures(latex);
  const factors = computeComplexityFactors(latex, features);
  const score = computeComplexityScore(factors, features);
  const level = classifyComplexityLevel(score);
  const recommendations = generateRecommendations(factors, features, level);
  const estimatedRenderTime = estimateRenderTime(score, factors);

  return {
    score,
    level,
    factors,
    recommendations,
    estimatedRenderTime,
  };
}

/**
 * Extract formula features
 */
function extractFeatures(latex: string): FormulaFeatures {
  return {
    hasMatrices: /\\begin\{(matrix|pmatrix|bmatrix|vmatrix)\}/.test(latex),
    hasIntegrals: /\\int/.test(latex),
    hasDerivatives: /\\(frac|partial|nabla|prime)/.test(latex),
    hasSummations: /\\sum/.test(latex),
    hasProducts: /\\prod/.test(latex),
    hasRoots: /\\sqrt/.test(latex),
    hasFractions: /\\frac/.test(latex),
    hasSubscripts: /_/.test(latex),
    hasSuperscripts: /\^/.test(latex),
    hasGreekLetters: /\\(alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|omega)/.test(latex),
    hasAccents: /\\(hat|tilde|bar|vec|dot|ddot)/.test(latex),
    hasDelimiters: /\\(left|right|big|Big)/.test(latex),
  };
}

/**
 * Compute complexity factors
 */
function computeComplexityFactors(latex: string, features: FormulaFeatures): ComplexityMetrics['factors'] {
  const nestedDepth = computeNestingDepth(latex);
  const operatorCount = countOperators(latex);
  const specialSymbols = countSpecialSymbols(latex);
  const integralCount = (latex.match(/\\int/g) || []).length;
  const derivativeCount = (latex.match(/\\(frac|partial)/g) || []).length;
  const sumProductCount = (latex.match(/\\(sum|prod)/g) || []).length;
  const fractionDepth = computeFractionDepth(latex);

  const factors: ComplexityMetrics['factors'] = {
    nestedDepth,
    operatorCount,
    specialSymbols,
    integralCount,
    derivativeCount,
    sumProductCount,
    fractionDepth,
  };

  // Add matrix dimensions if present
  if (features.hasMatrices) {
    factors.matrixDimensions = extractMatrixDimensions(latex);
  }

  return factors;
}

/**
 * Compute nesting depth (braces, environments)
 */
function computeNestingDepth(latex: string): number {
  let maxDepth = 0;
  let currentDepth = 0;

  for (const char of latex) {
    if (char === '{') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }

  return maxDepth;
}

/**
 * Count mathematical operators
 */
function countOperators(latex: string): number {
  const operators = ['+', '-', '*', '/', '=', '<', '>', '\\leq', '\\geq', '\\neq', '\\approx', '\\equiv'];
  let count = 0;

  for (const op of operators) {
    count += (latex.match(new RegExp(op.replace(/\\/g, '\\\\'), 'g')) || []).length;
  }

  return count;
}

/**
 * Count special symbols (Greek, arrows, sets, etc.)
 */
function countSpecialSymbols(latex: string): number {
  const patterns = [
    /\\[a-zA-Z]+/g, // LaTeX commands
    /[∫∑∏∂∇√±×÷≤≥≠≈∞∈∉⊂⊃∪∩]/g, // Unicode math symbols
  ];

  let count = 0;
  for (const pattern of patterns) {
    count += (latex.match(pattern) || []).length;
  }

  return count;
}

/**
 * Compute fraction nesting depth
 */
function computeFractionDepth(latex: string): number {
  let maxDepth = 0;
  let currentDepth = 0;
  let i = 0;

  while (i < latex.length) {
    if (latex.slice(i, i + 5) === '\\frac') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
      i += 5;
    } else if (latex[i] === '}' && currentDepth > 0) {
      // Approximate: decrement when closing a frac
      const remainingBraces = latex.slice(i).split('').filter(c => c === '}').length;
      const openBraces = latex.slice(0, i).split('').filter(c => c === '{').length;
      if (remainingBraces < openBraces) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
      i++;
    } else {
      i++;
    }
  }

  return maxDepth;
}

/**
 * Extract matrix dimensions
 */
function extractMatrixDimensions(latex: string): { rows: number; cols: number } {
  const matrixMatch = latex.match(/\\begin\{(?:p|b|v)?matrix\}(.*?)\\end\{(?:p|b|v)?matrix\}/s);
  if (!matrixMatch) {
    return { rows: 0, cols: 0 };
  }

  const content = matrixMatch[1];
  const rows = content.split('\\\\').filter(r => r.trim().length > 0);
  const cols = rows[0] ? rows[0].split('&').length : 0;

  return { rows: rows.length, cols };
}

/**
 * Compute complexity score (0-100)
 */
function computeComplexityScore(
  factors: ComplexityMetrics['factors'],
  features: FormulaFeatures
): number {
  let score = 0;

  // Nesting depth (0-20 points)
  score += Math.min(20, factors.nestedDepth * 3);

  // Operators (0-15 points)
  score += Math.min(15, factors.operatorCount * 1.5);

  // Special symbols (0-15 points)
  score += Math.min(15, factors.specialSymbols * 0.5);

  // Integrals, derivatives, sums (0-20 points)
  score += Math.min(20, (factors.integralCount + factors.derivativeCount + factors.sumProductCount) * 4);

  // Fraction depth (0-15 points)
  score += Math.min(15, factors.fractionDepth * 5);

  // Matrices (0-15 points)
  if (factors.matrixDimensions) {
    const { rows, cols } = factors.matrixDimensions;
    score += Math.min(15, (rows * cols) * 0.5);
  }

  // Feature bonuses
  if (features.hasAccents) score += 3;
  if (features.hasDelimiters) score += 2;

  return Math.min(100, Math.round(score));
}

/**
 * Classify complexity level
 */
function classifyComplexityLevel(score: number): ComplexityMetrics['level'] {
  if (score < 25) return 'simple';
  if (score < 50) return 'moderate';
  if (score < 75) return 'complex';
  return 'very_complex';
}

/**
 * Generate recommendations based on complexity
 */
function generateRecommendations(
  factors: ComplexityMetrics['factors'],
  features: FormulaFeatures,
  level: ComplexityMetrics['level']
): string[] {
  const recommendations: string[] = [];

  // Nesting recommendations
  if (factors.nestedDepth > 5) {
    recommendations.push('Consider breaking into multiple equations for readability');
    recommendations.push('Use intermediate variables to reduce nesting');
  }

  // Matrix recommendations
  if (factors.matrixDimensions && factors.matrixDimensions.rows * factors.matrixDimensions.cols > 9) {
    recommendations.push('Large matrix detected: consider using pmatrix for better formatting');
    recommendations.push('Export to PDF for best rendering quality');
  }

  // Fraction recommendations
  if (factors.fractionDepth > 2) {
    recommendations.push('Deep fraction nesting: verify OCR accuracy carefully');
    recommendations.push('Consider using display mode (\\displaystyle) for clarity');
  }

  // Integral/derivative recommendations
  if (factors.integralCount + factors.derivativeCount > 3) {
    recommendations.push('Multiple calculus operations: ensure bounds and limits are clear');
  }

  // General complexity recommendations
  if (level === 'very_complex') {
    recommendations.push('Very complex formula: recommend manual review of OCR output');
    recommendations.push('Consider splitting into step-by-step derivation');
    recommendations.push('Export as PDF with high DPI (300+) for best quality');
  } else if (level === 'complex') {
    recommendations.push('Complex formula: verify OCR accuracy before export');
    recommendations.push('Use KaTeX rendering for web, LaTeX for PDF');
  } else if (level === 'simple') {
    recommendations.push('Simple formula: suitable for all export formats');
  }

  return recommendations;
}

/**
 * Estimate rendering time based on complexity
 */
function estimateRenderTime(score: number, factors: ComplexityMetrics['factors']): number {
  let baseTime = 10; // milliseconds

  // Complexity score impact
  baseTime += score * 0.5;

  // Matrix rendering is expensive
  if (factors.matrixDimensions) {
    const cells = factors.matrixDimensions.rows * factors.matrixDimensions.cols;
    baseTime += cells * 2;
  }

  // Integrals and derivatives
  baseTime += (factors.integralCount + factors.derivativeCount) * 3;

  // Fraction depth
  baseTime += factors.fractionDepth * 5;

  return Math.round(baseTime);
}

/**
 * Batch analyze multiple formulas
 */
export function batchAnalyzeFormulas(formulas: string[]): ComplexityMetrics[] {
  return formulas.map(analyzeFormulaComplexity);
}

/**
 * Get aggregate stats for a document
 */
export function getDocumentComplexityStats(formulas: string[]): {
  avgScore: number;
  maxScore: number;
  distribution: Record<ComplexityMetrics['level'], number>;
  totalEstimatedRenderTime: number;
} {
  const analyses = batchAnalyzeFormulas(formulas);

  const scores = analyses.map(a => a.score);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length || 0;
  const maxScore = Math.max(...scores, 0);

  const distribution: Record<ComplexityMetrics['level'], number> = {
    simple: 0,
    moderate: 0,
    complex: 0,
    very_complex: 0,
  };

  analyses.forEach(a => {
    distribution[a.level]++;
  });

  const totalEstimatedRenderTime = analyses.reduce((sum, a) => sum + a.estimatedRenderTime, 0);

  return {
    avgScore: Math.round(avgScore),
    maxScore,
    distribution,
    totalEstimatedRenderTime,
  };
}
