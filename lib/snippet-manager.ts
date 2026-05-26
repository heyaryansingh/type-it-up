/**
 * LaTeX snippet manager for commonly used code blocks and templates.
 *
 * This module provides a searchable library of LaTeX snippets with categories,
 * tags, and quick insertion capabilities for academic writing.
 */

export interface SnippetMetadata {
  id: string;
  name: string;
  description: string;
  category: SnippetCategory;
  tags: string[];
  author?: string;
  usageCount: number;
  lastUsed?: Date;
}

export interface LaTeXSnippet extends SnippetMetadata {
  code: string;
  placeholders: SnippetPlaceholder[];
  dependencies: string[]; // Required LaTeX packages
  preview?: string;
}

export interface SnippetPlaceholder {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

export enum SnippetCategory {
  EQUATION = 'equation',
  FIGURE = 'figure',
  TABLE = 'table',
  THEOREM = 'theorem',
  ALGORITHM = 'algorithm',
  BIBLIOGRAPHY = 'bibliography',
  FORMATTING = 'formatting',
  TIKZ = 'tikz',
  CHEMISTRY = 'chemistry',
  CUSTOM = 'custom',
}

export class SnippetManager {
  private snippets: Map<string, LaTeXSnippet>;
  private categories: Map<SnippetCategory, LaTeXSnippet[]>;
  private tagIndex: Map<string, Set<string>>;

  constructor() {
    this.snippets = new Map();
    this.categories = new Map();
    this.tagIndex = new Map();
    this.initializeDefaultSnippets();
  }

  /**
   * Initialize library with default snippets.
   */
  private initializeDefaultSnippets(): void {
    const defaults: LaTeXSnippet[] = [
      {
        id: 'align-equation',
        name: 'Aligned Equations',
        description: 'Multi-line aligned equations',
        category: SnippetCategory.EQUATION,
        tags: ['math', 'align', 'multiline'],
        code: `\\begin{align}
  {{equation1}} &= {{expression1}} \\\\
  {{equation2}} &= {{expression2}}
\\end{align}`,
        placeholders: [
          { name: 'equation1', description: 'First equation LHS', required: true },
          { name: 'expression1', description: 'First equation RHS', required: true },
          { name: 'equation2', description: 'Second equation LHS', required: true },
          { name: 'expression2', description: 'Second equation RHS', required: true },
        ],
        dependencies: ['amsmath'],
        usageCount: 0,
      },
      {
        id: 'figure-subfigure',
        name: 'Subfigures',
        description: 'Multiple subfigures in one figure environment',
        category: SnippetCategory.FIGURE,
        tags: ['figure', 'subfigure', 'image'],
        code: `\\begin{figure}[{{placement}}]
  \\centering
  \\begin{subfigure}{{{width1}}}
    \\includegraphics[width=\\textwidth]{{{image1}}}
    \\caption{{{caption1}}}
    \\label{fig:{{label1}}}
  \\end{subfigure}
  \\hfill
  \\begin{subfigure}{{{width2}}}
    \\includegraphics[width=\\textwidth]{{{image2}}}
    \\caption{{{caption2}}}
    \\label{fig:{{label2}}}
  \\end{subfigure}
  \\caption{{{main_caption}}}
  \\label{fig:{{main_label}}}
\\end{figure}`,
        placeholders: [
          { name: 'placement', description: 'Placement specifier', defaultValue: 'htbp', required: false },
          { name: 'width1', description: 'First subfigure width', defaultValue: '0.45\\textwidth', required: true },
          { name: 'image1', description: 'First image path', required: true },
          { name: 'caption1', description: 'First subfigure caption', required: true },
          { name: 'label1', description: 'First subfigure label', required: true },
          { name: 'width2', description: 'Second subfigure width', defaultValue: '0.45\\textwidth', required: true },
          { name: 'image2', description: 'Second image path', required: true },
          { name: 'caption2', description: 'Second subfigure caption', required: true },
          { name: 'label2', description: 'Second subfigure label', required: true },
          { name: 'main_caption', description: 'Main figure caption', required: true },
          { name: 'main_label', description: 'Main figure label', required: true },
        ],
        dependencies: ['graphicx', 'subcaption'],
        usageCount: 0,
      },
      {
        id: 'booktabs-table',
        name: 'Professional Table',
        description: 'Publication-quality table with booktabs',
        category: SnippetCategory.TABLE,
        tags: ['table', 'booktabs', 'professional'],
        code: `\\begin{table}[{{placement}}]
  \\centering
  \\caption{{{caption}}}
  \\label{tab:{{label}}}
  \\begin{tabular}{{{columns}}}
    \\toprule
    {{header}} \\\\
    \\midrule
    {{rows}} \\\\
    \\bottomrule
  \\end{tabular}
\\end{table}`,
        placeholders: [
          { name: 'placement', description: 'Placement specifier', defaultValue: 'htbp', required: false },
          { name: 'caption', description: 'Table caption', required: true },
          { name: 'label', description: 'Table label', required: true },
          { name: 'columns', description: 'Column specification', defaultValue: 'lcc', required: true },
          { name: 'header', description: 'Header row', required: true },
          { name: 'rows', description: 'Data rows', required: true },
        ],
        dependencies: ['booktabs'],
        usageCount: 0,
      },
      {
        id: 'theorem-proof',
        name: 'Theorem with Proof',
        description: 'Theorem environment with proof',
        category: SnippetCategory.THEOREM,
        tags: ['theorem', 'proof', 'math'],
        code: `\\begin{theorem}[{{name}}]
\\label{thm:{{label}}}
{{statement}}
\\end{theorem}

\\begin{proof}
{{proof_content}}
\\end{proof}`,
        placeholders: [
          { name: 'name', description: 'Theorem name', required: false },
          { name: 'label', description: 'Theorem label', required: true },
          { name: 'statement', description: 'Theorem statement', required: true },
          { name: 'proof_content', description: 'Proof content', required: true },
        ],
        dependencies: ['amsthm'],
        usageCount: 0,
      },
      {
        id: 'algorithm2e',
        name: 'Algorithm Block',
        description: 'Algorithm using algorithm2e package',
        category: SnippetCategory.ALGORITHM,
        tags: ['algorithm', 'pseudocode'],
        code: `\\begin{algorithm}[{{placement}}]
\\caption{{{caption}}}
\\label{alg:{{label}}}
\\KwIn{{{input}}}
\\KwOut{{{output}}}
{{algorithm_body}}
\\end{algorithm}`,
        placeholders: [
          { name: 'placement', description: 'Placement', defaultValue: 'H', required: false },
          { name: 'caption', description: 'Algorithm caption', required: true },
          { name: 'label', description: 'Algorithm label', required: true },
          { name: 'input', description: 'Input parameters', required: true },
          { name: 'output', description: 'Output', required: true },
          { name: 'algorithm_body', description: 'Algorithm pseudocode', required: true },
        ],
        dependencies: ['algorithm2e'],
        usageCount: 0,
      },
    ];

    defaults.forEach(snippet => this.addSnippet(snippet));
  }

  /**
   * Add a snippet to the library.
   */
  addSnippet(snippet: LaTeXSnippet): void {
    this.snippets.set(snippet.id, snippet);

    // Update category index
    if (!this.categories.has(snippet.category)) {
      this.categories.set(snippet.category, []);
    }
    this.categories.get(snippet.category)!.push(snippet);

    // Update tag index
    snippet.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(snippet.id);
    });
  }

  /**
   * Search snippets by query.
   */
  search(query: string): LaTeXSnippet[] {
    const lowerQuery = query.toLowerCase();
    const results: LaTeXSnippet[] = [];

    this.snippets.forEach(snippet => {
      const matchesName = snippet.name.toLowerCase().includes(lowerQuery);
      const matchesDescription = snippet.description.toLowerCase().includes(lowerQuery);
      const matchesTags = snippet.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

      if (matchesName || matchesDescription || matchesTags) {
        results.push(snippet);
      }
    });

    // Sort by relevance (usage count and match quality)
    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === lowerQuery || a.tags.includes(lowerQuery);
      const bExact = b.name.toLowerCase() === lowerQuery || b.tags.includes(lowerQuery);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return b.usageCount - a.usageCount;
    });
  }

  /**
   * Get snippets by category.
   */
  getByCategory(category: SnippetCategory): LaTeXSnippet[] {
    return this.categories.get(category) || [];
  }

  /**
   * Get snippets by tag.
   */
  getByTag(tag: string): LaTeXSnippet[] {
    const snippetIds = this.tagIndex.get(tag);
    if (!snippetIds) return [];

    return Array.from(snippetIds)
      .map(id => this.snippets.get(id))
      .filter((s): s is LaTeXSnippet => s !== undefined);
  }

  /**
   * Get most used snippets.
   */
  getMostUsed(limit: number = 10): LaTeXSnippet[] {
    return Array.from(this.snippets.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Insert snippet with placeholders filled.
   */
  insertSnippet(
    snippetId: string,
    placeholderValues: Record<string, string>
  ): string {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) {
      throw new Error(`Snippet not found: ${snippetId}`);
    }

    let code = snippet.code;

    // Replace placeholders
    snippet.placeholders.forEach(placeholder => {
      const value =
        placeholderValues[placeholder.name] ||
        placeholder.defaultValue ||
        (placeholder.required ? `{{${placeholder.name}}}` : '');

      const regex = new RegExp(`{{${placeholder.name}}}`, 'g');
      code = code.replace(regex, value);
    });

    // Update usage stats
    snippet.usageCount++;
    snippet.lastUsed = new Date();

    return code;
  }

  /**
   * Get required packages for a snippet.
   */
  getRequiredPackages(snippetId: string): string[] {
    const snippet = this.snippets.get(snippetId);
    return snippet ? snippet.dependencies : [];
  }

  /**
   * Export snippet library to JSON.
   */
  exportLibrary(): string {
    const data = Array.from(this.snippets.values());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import snippets from JSON.
   */
  importLibrary(json: string): void {
    try {
      const snippets = JSON.parse(json) as LaTeXSnippet[];
      snippets.forEach(snippet => this.addSnippet(snippet));
    } catch (error) {
      throw new Error(`Failed to import library: ${error}`);
    }
  }

  /**
   * Get snippet statistics.
   */
  getStatistics(): {
    totalSnippets: number;
    categoryCounts: Record<string, number>;
    mostUsedTags: Array<{ tag: string; count: number }>;
  } {
    const categoryCounts: Record<string, number> = {};
    this.categories.forEach((snippets, category) => {
      categoryCounts[category] = snippets.length;
    });

    const tagCounts: Record<string, number> = {};
    this.tagIndex.forEach((snippetIds, tag) => {
      tagCounts[tag] = snippetIds.size;
    });

    const mostUsedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSnippets: this.snippets.size,
      categoryCounts,
      mostUsedTags,
    };
  }

  /**
   * Validate snippet code for common issues.
   */
  validateSnippet(snippetId: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const snippet = this.snippets.get(snippetId);
    if (!snippet) {
      return { valid: false, errors: ['Snippet not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for balanced braces
    const openBraces = (snippet.code.match(/\\begin{/g) || []).length;
    const closeBraces = (snippet.code.match(/\\end{/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced begin/end environments');
    }

    // Check for required placeholders
    const missingRequired = snippet.placeholders
      .filter(p => p.required)
      .filter(p => !snippet.code.includes(`{{${p.name}}}`));

    if (missingRequired.length > 0) {
      warnings.push(
        `Missing required placeholders: ${missingRequired.map(p => p.name).join(', ')}`
      );
    }

    // Check for common LaTeX mistakes
    if (snippet.code.includes('\\\\\\\\')) {
      warnings.push('Double line breaks detected');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Create a custom snippet from template.
 */
export function createCustomSnippet(
  name: string,
  code: string,
  description: string,
  tags: string[]
): LaTeXSnippet {
  // Extract placeholders from code
  const placeholderRegex = /{{(\w+)}}/g;
  const placeholderMatches = Array.from(code.matchAll(placeholderRegex));
  const uniquePlaceholders = [...new Set(placeholderMatches.map(m => m[1]))];

  const placeholders: SnippetPlaceholder[] = uniquePlaceholders.map(name => ({
    name,
    description: `Value for ${name}`,
    required: true,
  }));

  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    category: SnippetCategory.CUSTOM,
    tags,
    code,
    placeholders,
    dependencies: [],
    usageCount: 0,
  };
}
