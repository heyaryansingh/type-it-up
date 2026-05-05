/**
 * Diagram classification and extraction utilities for automated diagram processing.
 *
 * Provides utilities to:
 * - Classify diagrams by type (flowchart, UML, graph, circuit, etc.)
 * - Extract diagram features and metadata
 * - Suggest appropriate conversion strategies
 * - Generate TikZ templates based on diagram type
 *
 * @module diagram-classifier
 */

export type DiagramType =
  | 'flowchart'
  | 'uml_class'
  | 'uml_sequence'
  | 'uml_state'
  | 'graph_directed'
  | 'graph_undirected'
  | 'circuit'
  | 'mindmap'
  | 'tree'
  | 'venn'
  | 'plot'
  | 'geometric'
  | 'unknown';

export interface DiagramClassification {
  type: DiagramType;
  confidence: number;
  features: DiagramFeatures;
  suggestions: ConversionSuggestion[];
}

export interface DiagramFeatures {
  hasArrows: boolean;
  hasLabels: boolean;
  nodeCount: number;
  edgeCount: number;
  hasCycles: boolean;
  isHierarchical: boolean;
  hasSymbols: boolean;
  symbolTypes: string[];
  layoutType: 'horizontal' | 'vertical' | 'radial' | 'grid' | 'free-form';
}

export interface ConversionSuggestion {
  format: 'tikz' | 'svg' | 'mermaid' | 'graphviz';
  confidence: number;
  reasoning: string;
  template?: string;
}

/**
 * Classify a diagram based on its visual features and structure.
 *
 * @param imageUrl - URL or base64 data URI of the diagram image
 * @param metadata - Optional metadata from OCR or manual input
 * @returns Classification result with type, confidence, and suggestions
 *
 * @example
 * ```ts
 * const result = await classifyDiagram('data:image/png;base64,...');
 * console.log(`Detected ${result.type} with ${result.confidence * 100}% confidence`);
 * for (const suggestion of result.suggestions) {
 *   console.log(`Suggest ${suggestion.format}: ${suggestion.reasoning}`);
 * }
 * ```
 */
export async function classifyDiagram(
  imageUrl: string,
  metadata?: Partial<DiagramFeatures>
): Promise<DiagramClassification> {
  // Extract features from image (simplified heuristics for now)
  const features = await extractFeatures(imageUrl, metadata);

  // Classify based on features
  const { type, confidence } = determineType(features);

  // Generate conversion suggestions
  const suggestions = generateSuggestions(type, features);

  return {
    type,
    confidence,
    features,
    suggestions,
  };
}

/**
 * Extract visual features from diagram image.
 * In a real implementation, this would use computer vision.
 */
async function extractFeatures(
  imageUrl: string,
  metadata?: Partial<DiagramFeatures>
): Promise<DiagramFeatures> {
  // Default features (would be extracted from image in production)
  const defaultFeatures: DiagramFeatures = {
    hasArrows: metadata?.hasArrows ?? false,
    hasLabels: metadata?.hasLabels ?? true,
    nodeCount: metadata?.nodeCount ?? 0,
    edgeCount: metadata?.edgeCount ?? 0,
    hasCycles: metadata?.hasCycles ?? false,
    isHierarchical: metadata?.isHierarchical ?? false,
    hasSymbols: metadata?.hasSymbols ?? false,
    symbolTypes: metadata?.symbolTypes ?? [],
    layoutType: metadata?.layoutType ?? 'free-form',
  };

  return defaultFeatures;
}

/**
 * Determine diagram type based on extracted features.
 */
function determineType(features: DiagramFeatures): { type: DiagramType; confidence: number } {
  let maxScore = 0;
  let bestType: DiagramType = 'unknown';

  const scores: Record<DiagramType, number> = {
    flowchart: calculateFlowchartScore(features),
    uml_class: calculateUMLClassScore(features),
    uml_sequence: calculateUMLSequenceScore(features),
    uml_state: calculateUMLStateScore(features),
    graph_directed: calculateDirectedGraphScore(features),
    graph_undirected: calculateUndirectedGraphScore(features),
    circuit: calculateCircuitScore(features),
    mindmap: calculateMindmapScore(features),
    tree: calculateTreeScore(features),
    venn: calculateVennScore(features),
    plot: calculatePlotScore(features),
    geometric: calculateGeometricScore(features),
    unknown: 0,
  };

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestType = type as DiagramType;
    }
  }

  // Confidence based on score separation
  const confidence = Math.min(maxScore / 100, 1.0);

  return { type: bestType, confidence };
}

/**
 * Scoring functions for each diagram type.
 */
function calculateFlowchartScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.hasArrows) score += 40;
  if (features.hasLabels) score += 20;
  if (features.nodeCount > 2) score += 20;
  if (features.symbolTypes.includes('diamond')) score += 20; // Decision nodes

  return score;
}

function calculateUMLClassScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.symbolTypes.includes('rectangle')) score += 30;
  if (features.hasLabels) score += 25;
  if (features.layoutType === 'grid' || features.layoutType === 'horizontal') score += 25;
  if (features.nodeCount >= 3) score += 20;

  return score;
}

function calculateUMLSequenceScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.hasArrows) score += 30;
  if (features.layoutType === 'horizontal') score += 30;
  if (features.hasLabels) score += 20;
  if (features.symbolTypes.includes('lifeline')) score += 20;

  return score;
}

function calculateUMLStateScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.hasArrows) score += 35;
  if (features.hasCycles) score += 25;
  if (features.symbolTypes.includes('circle') || features.symbolTypes.includes('rounded')) score += 20;
  if (features.nodeCount > 2) score += 20;

  return score;
}

function calculateDirectedGraphScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.hasArrows) score += 40;
  if (features.nodeCount > 3) score += 30;
  if (features.edgeCount > features.nodeCount) score += 20;
  if (!features.isHierarchical) score += 10;

  return score;
}

function calculateUndirectedGraphScore(features: DiagramFeatures): number {
  let score = 0;

  if (!features.hasArrows) score += 40;
  if (features.nodeCount > 3) score += 30;
  if (features.edgeCount >= features.nodeCount - 1) score += 20;
  if (features.layoutType === 'free-form') score += 10;

  return score;
}

function calculateCircuitScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.hasSymbols) score += 40;
  if (features.symbolTypes.includes('resistor') || features.symbolTypes.includes('capacitor')) score += 30;
  if (features.hasLabels) score += 15;
  if (features.edgeCount > 0) score += 15;

  return score;
}

function calculateMindmapScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.isHierarchical) score += 35;
  if (features.layoutType === 'radial') score += 35;
  if (features.nodeCount > 5) score += 20;
  if (!features.hasCycles) score += 10;

  return score;
}

function calculateTreeScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.isHierarchical) score += 40;
  if (!features.hasCycles) score += 30;
  if (features.layoutType === 'vertical' || features.layoutType === 'horizontal') score += 20;
  if (features.nodeCount > 2) score += 10;

  return score;
}

function calculateVennScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.symbolTypes.includes('circle') || features.symbolTypes.includes('ellipse')) score += 50;
  if (features.nodeCount >= 2 && features.nodeCount <= 4) score += 30;
  if (features.hasLabels) score += 20;

  return score;
}

function calculatePlotScore(features: DiagramFeatures): number {
  let score = 0;

  if (features.symbolTypes.includes('axis')) score += 40;
  if (features.symbolTypes.includes('line') || features.symbolTypes.includes('curve')) score += 30;
  if (features.hasLabels) score += 20;
  if (features.layoutType === 'grid') score += 10;

  return score;
}

function calculateGeometricScore(features: DiagramFeatures): number {
  let score = 0;

  const geometricShapes = ['circle', 'triangle', 'square', 'rectangle', 'polygon'];
  const hasGeometric = features.symbolTypes.some(s => geometricShapes.includes(s));

  if (hasGeometric) score += 35;
  if (features.nodeCount <= 5) score += 25;
  if (features.hasLabels) score += 20;
  if (features.layoutType === 'free-form' || features.layoutType === 'grid') score += 20;

  return score;
}

/**
 * Generate conversion suggestions based on diagram type.
 */
function generateSuggestions(type: DiagramType, features: DiagramFeatures): ConversionSuggestion[] {
  const suggestions: ConversionSuggestion[] = [];

  switch (type) {
    case 'flowchart':
      suggestions.push({
        format: 'tikz',
        confidence: 0.9,
        reasoning: 'TikZ provides excellent flowchart support with precise control',
        template: getTikZFlowchartTemplate(),
      });
      suggestions.push({
        format: 'mermaid',
        confidence: 0.8,
        reasoning: 'Mermaid is simpler and better for web rendering',
      });
      break;

    case 'uml_class':
    case 'uml_sequence':
    case 'uml_state':
      suggestions.push({
        format: 'tikz',
        confidence: 0.85,
        reasoning: 'TikZ-UML package provides comprehensive UML support',
        template: getTikZUMLTemplate(),
      });
      suggestions.push({
        format: 'mermaid',
        confidence: 0.75,
        reasoning: 'Mermaid supports basic UML diagrams',
      });
      break;

    case 'graph_directed':
    case 'graph_undirected':
      suggestions.push({
        format: 'graphviz',
        confidence: 0.9,
        reasoning: 'Graphviz excels at automatic graph layout',
      });
      suggestions.push({
        format: 'tikz',
        confidence: 0.8,
        reasoning: 'TikZ offers more manual control over graph appearance',
      });
      break;

    case 'circuit':
      suggestions.push({
        format: 'tikz',
        confidence: 0.95,
        reasoning: 'CircuiTikZ is the standard for circuit diagrams in LaTeX',
        template: getCircuiTikZTemplate(),
      });
      break;

    case 'mindmap':
      suggestions.push({
        format: 'tikz',
        confidence: 0.85,
        reasoning: 'TikZ mindmap library provides excellent support',
        template: getTikZMindmapTemplate(),
      });
      break;

    case 'plot':
      suggestions.push({
        format: 'tikz',
        confidence: 0.9,
        reasoning: 'PGFPlots provides publication-quality plots',
        template: getPGFPlotsTemplate(),
      });
      break;

    default:
      suggestions.push({
        format: 'tikz',
        confidence: 0.6,
        reasoning: 'TikZ is versatile for most diagram types',
      });
      suggestions.push({
        format: 'svg',
        confidence: 0.7,
        reasoning: 'SVG provides good web compatibility',
      });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * TikZ template generators for different diagram types.
 */
function getTikZFlowchartTemplate(): string {
  return `\\begin{tikzpicture}[node distance=2cm, auto]
  \\node [draw, rectangle] (start) {Start};
  \\node [draw, diamond, below of=start] (decision) {Decision?};
  \\node [draw, rectangle, below left of=decision] (yes) {Yes Path};
  \\node [draw, rectangle, below right of=decision] (no) {No Path};
  \\node [draw, rectangle, below of=yes] (end) {End};

  \\draw[->] (start) -- (decision);
  \\draw[->] (decision) -- node {yes} (yes);
  \\draw[->] (decision) -- node {no} (no);
  \\draw[->] (yes) -- (end);
  \\draw[->] (no) -- (end);
\\end{tikzpicture}`;
}

function getTikZUMLTemplate(): string {
  return `\\begin{tikzpicture}
  \\umlclass{ClassName}{
    - attribute1 : Type \\\\
    - attribute2 : Type
  }{
    + method1() : ReturnType \\\\
    + method2() : ReturnType
  }
\\end{tikzpicture}`;
}

function getCircuiTikZTemplate(): string {
  return `\\begin{circuitikz}
  \\draw (0,0)
    to[V, v=$V_s$] (0,2)
    to[R, l=$R_1$] (2,2)
    to[R, l=$R_2$] (2,0)
    -- (0,0);
\\end{circuitikz}`;
}

function getTikZMindmapTemplate(): string {
  return `\\begin{tikzpicture}[mindmap, grow cyclic, every node/.style=concept]
  \\node {Central Concept}
    child { node {Branch 1} }
    child { node {Branch 2} }
    child { node {Branch 3} };
\\end{tikzpicture}`;
}

function getPGFPlotsTemplate(): string {
  return `\\begin{tikzpicture}
  \\begin{axis}[
    xlabel=$x$,
    ylabel=$y$,
    grid=major
  ]
  \\addplot[color=blue, mark=*] coordinates {
    (0,0) (1,1) (2,4) (3,9)
  };
  \\end{axis}
\\end{tikzpicture}`;
}

/**
 * Get recommended TikZ libraries for a diagram type.
 *
 * @param type - The diagram type
 * @returns Array of LaTeX package/library requirements
 *
 * @example
 * ```ts
 * const libs = getRequiredLibraries('flowchart');
 * console.log(libs); // ['\\usetikzlibrary{shapes.geometric}', ...]
 * ```
 */
export function getRequiredLibraries(type: DiagramType): string[] {
  const libraries: Record<DiagramType, string[]> = {
    flowchart: ['\\usetikzlibrary{shapes.geometric}', '\\usetikzlibrary{arrows.meta}'],
    uml_class: ['\\usepackage{tikz-uml}'],
    uml_sequence: ['\\usepackage{tikz-uml}'],
    uml_state: ['\\usepackage{tikz-uml}'],
    graph_directed: ['\\usetikzlibrary{graphs}', '\\usetikzlibrary{graphdrawing}'],
    graph_undirected: ['\\usetikzlibrary{graphs}', '\\usetikzlibrary{graphdrawing}'],
    circuit: ['\\usepackage{circuitikz}'],
    mindmap: ['\\usetikzlibrary{mindmap}'],
    tree: ['\\usetikzlibrary{trees}'],
    venn: ['\\usetikzlibrary{shapes.geometric}'],
    plot: ['\\usepackage{pgfplots}', '\\pgfplotsset{compat=1.18}'],
    geometric: ['\\usetikzlibrary{shapes.geometric}'],
    unknown: [],
  };

  return libraries[type] || [];
}
