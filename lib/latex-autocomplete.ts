/**
 * LaTeX autocomplete engine with context-aware suggestions.
 * Provides intelligent code completion for commands, environments, and citations.
 */

export interface AutocompleteItem {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
  kind: CompletionKind;
  sortPriority?: number;
}

export enum CompletionKind {
  Command = 'command',
  Environment = 'environment',
  Citation = 'citation',
  Reference = 'reference',
  Package = 'package',
  Snippet = 'snippet',
}

interface CompletionContext {
  currentLine: string;
  cursorPosition: number;
  documentContent: string;
  recentCommands: string[];
}

/**
 * LaTeX command database with common commands and their parameters.
 */
const LATEX_COMMANDS: AutocompleteItem[] = [
  {
    label: '\\section',
    insertText: '\\section{$1}',
    detail: 'Section heading',
    documentation: 'Creates a numbered section heading',
    kind: CompletionKind.Command,
    sortPriority: 10,
  },
  {
    label: '\\subsection',
    insertText: '\\subsection{$1}',
    detail: 'Subsection heading',
    documentation: 'Creates a numbered subsection heading',
    kind: CompletionKind.Command,
    sortPriority: 9,
  },
  {
    label: '\\begin',
    insertText: '\\begin{$1}\n\t$2\n\\end{$1}',
    detail: 'Environment',
    documentation: 'Start an environment block',
    kind: CompletionKind.Command,
    sortPriority: 8,
  },
  {
    label: '\\frac',
    insertText: '\\frac{$1}{$2}',
    detail: 'Fraction',
    documentation: 'Creates a fraction with numerator and denominator',
    kind: CompletionKind.Command,
    sortPriority: 7,
  },
  {
    label: '\\sqrt',
    insertText: '\\sqrt{$1}',
    detail: 'Square root',
    documentation: 'Square root symbol',
    kind: CompletionKind.Command,
    sortPriority: 7,
  },
  {
    label: '\\textbf',
    insertText: '\\textbf{$1}',
    detail: 'Bold text',
    documentation: 'Make text bold',
    kind: CompletionKind.Command,
    sortPriority: 6,
  },
  {
    label: '\\textit',
    insertText: '\\textit{$1}',
    detail: 'Italic text',
    documentation: 'Make text italic',
    kind: CompletionKind.Command,
    sortPriority: 6,
  },
  {
    label: '\\cite',
    insertText: '\\cite{$1}',
    detail: 'Citation',
    documentation: 'Insert a citation reference',
    kind: CompletionKind.Command,
    sortPriority: 5,
  },
  {
    label: '\\ref',
    insertText: '\\ref{$1}',
    detail: 'Reference',
    documentation: 'Insert a cross-reference to a label',
    kind: CompletionKind.Command,
    sortPriority: 5,
  },
  {
    label: '\\label',
    insertText: '\\label{$1}',
    detail: 'Label',
    documentation: 'Create a label for cross-referencing',
    kind: CompletionKind.Command,
    sortPriority: 5,
  },
  {
    label: '\\includegraphics',
    insertText: '\\includegraphics[width=$1\\textwidth]{$2}',
    detail: 'Include image',
    documentation: 'Insert an image from file',
    kind: CompletionKind.Command,
    sortPriority: 4,
  },
];

/**
 * Common LaTeX environments.
 */
const LATEX_ENVIRONMENTS: AutocompleteItem[] = [
  {
    label: 'equation',
    insertText: '\\begin{equation}\n\t$1\n\\end{equation}',
    detail: 'Numbered equation',
    kind: CompletionKind.Environment,
    sortPriority: 10,
  },
  {
    label: 'align',
    insertText: '\\begin{align}\n\t$1\n\\end{align}',
    detail: 'Aligned equations',
    kind: CompletionKind.Environment,
    sortPriority: 9,
  },
  {
    label: 'itemize',
    insertText: '\\begin{itemize}\n\t\\item $1\n\\end{itemize}',
    detail: 'Bullet list',
    kind: CompletionKind.Environment,
    sortPriority: 8,
  },
  {
    label: 'enumerate',
    insertText: '\\begin{enumerate}\n\t\\item $1\n\\end{enumerate}',
    detail: 'Numbered list',
    kind: CompletionKind.Environment,
    sortPriority: 8,
  },
  {
    label: 'figure',
    insertText:
      '\\begin{figure}[h]\n\t\\centering\n\t\\includegraphics[width=0.8\\textwidth]{$1}\n\t\\caption{$2}\n\t\\label{fig:$3}\n\\end{figure}',
    detail: 'Figure environment',
    kind: CompletionKind.Environment,
    sortPriority: 7,
  },
  {
    label: 'table',
    insertText:
      '\\begin{table}[h]\n\t\\centering\n\t\\begin{tabular}{$1}\n\t\t$2\n\t\\end{tabular}\n\t\\caption{$3}\n\t\\label{tab:$4}\n\\end{table}',
    detail: 'Table environment',
    kind: CompletionKind.Environment,
    sortPriority: 7,
  },
];

/**
 * Math symbol completions.
 */
const MATH_SYMBOLS: AutocompleteItem[] = [
  { label: '\\alpha', insertText: '\\alpha', detail: 'α', kind: CompletionKind.Command },
  { label: '\\beta', insertText: '\\beta', detail: 'β', kind: CompletionKind.Command },
  { label: '\\gamma', insertText: '\\gamma', detail: 'γ', kind: CompletionKind.Command },
  { label: '\\delta', insertText: '\\delta', detail: 'δ', kind: CompletionKind.Command },
  { label: '\\epsilon', insertText: '\\epsilon', detail: 'ε', kind: CompletionKind.Command },
  { label: '\\theta', insertText: '\\theta', detail: 'θ', kind: CompletionKind.Command },
  { label: '\\lambda', insertText: '\\lambda', detail: 'λ', kind: CompletionKind.Command },
  { label: '\\mu', insertText: '\\mu', detail: 'μ', kind: CompletionKind.Command },
  { label: '\\pi', insertText: '\\pi', detail: 'π', kind: CompletionKind.Command },
  { label: '\\sigma', insertText: '\\sigma', detail: 'σ', kind: CompletionKind.Command },
  { label: '\\infty', insertText: '\\infty', detail: '∞', kind: CompletionKind.Command },
  { label: '\\sum', insertText: '\\sum_{$1}^{$2}', detail: '∑', kind: CompletionKind.Command },
  { label: '\\int', insertText: '\\int_{$1}^{$2}', detail: '∫', kind: CompletionKind.Command },
  { label: '\\prod', insertText: '\\prod_{$1}^{$2}', detail: '∏', kind: CompletionKind.Command },
  { label: '\\lim', insertText: '\\lim_{$1}', detail: 'lim', kind: CompletionKind.Command },
];

export class LatexAutocomplete {
  private recentCommands: string[] = [];
  private customSnippets: Map<string, AutocompleteItem> = new Map();
  private documentCitations: Set<string> = new Set();
  private documentLabels: Set<string> = new Set();

  /**
   * Get autocomplete suggestions based on current context.
   */
  getSuggestions(context: CompletionContext): AutocompleteItem[] {
    const { currentLine, cursorPosition } = context;
    const textBeforeCursor = currentLine.substring(0, cursorPosition);

    // Detect what kind of completion is needed
    if (this.isEnvironmentCompletion(textBeforeCursor)) {
      return this.getEnvironmentCompletions(textBeforeCursor);
    }

    if (this.isCitationCompletion(textBeforeCursor)) {
      return this.getCitationCompletions();
    }

    if (this.isReferenceCompletion(textBeforeCursor)) {
      return this.getReferenceCompletions();
    }

    if (this.isMathContext(context.documentContent, cursorPosition)) {
      return this.getMathCompletions(textBeforeCursor);
    }

    if (this.isCommandCompletion(textBeforeCursor)) {
      return this.getCommandCompletions(textBeforeCursor);
    }

    return [];
  }

  /**
   * Check if user is typing a command.
   */
  private isCommandCompletion(text: string): boolean {
    return /\\[a-zA-Z]*$/.test(text);
  }

  /**
   * Check if user is completing an environment name.
   */
  private isEnvironmentCompletion(text: string): boolean {
    return /\\begin\{[a-zA-Z]*$/.test(text) || /\\end\{[a-zA-Z]*$/.test(text);
  }

  /**
   * Check if user is completing a citation.
   */
  private isCitationCompletion(text: string): boolean {
    return /\\cite\{[^}]*$/.test(text);
  }

  /**
   * Check if user is completing a reference.
   */
  private isReferenceCompletion(text: string): boolean {
    return /\\ref\{[^}]*$/.test(text);
  }

  /**
   * Check if cursor is inside math environment.
   */
  private isMathContext(documentContent: string, cursorPosition: number): boolean {
    const beforeCursor = documentContent.substring(0, cursorPosition);

    // Count unmatched $ symbols (inline math)
    const dollarCount = (beforeCursor.match(/\$/g) || []).length;
    if (dollarCount % 2 === 1) return true;

    // Check for equation environments
    const mathEnvs = ['equation', 'align', 'gather', 'multline', 'displaymath'];
    for (const env of mathEnvs) {
      const beginPattern = new RegExp(`\\\\begin\\{${env}\\}`, 'g');
      const endPattern = new RegExp(`\\\\end\\{${env}\\}`, 'g');

      const begins = (beforeCursor.match(beginPattern) || []).length;
      const ends = (beforeCursor.match(endPattern) || []).length;

      if (begins > ends) return true;
    }

    return false;
  }

  /**
   * Get command completions.
   */
  private getCommandCompletions(textBeforeCursor: string): AutocompleteItem[] {
    const match = textBeforeCursor.match(/\\([a-zA-Z]*)$/);
    if (!match) return [];

    const prefix = match[1].toLowerCase();

    const allCommands = [
      ...LATEX_COMMANDS,
      ...Array.from(this.customSnippets.values()),
    ];

    return allCommands
      .filter(item => item.label.toLowerCase().includes(prefix))
      .sort((a, b) => {
        // Prioritize by sort priority and exact prefix match
        const aPriority = a.sortPriority || 0;
        const bPriority = b.sortPriority || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        const aStarts = a.label.toLowerCase().startsWith(`\\${prefix}`);
        const bStarts = b.label.toLowerCase().startsWith(`\\${prefix}`);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.label.localeCompare(b.label);
      });
  }

  /**
   * Get environment completions.
   */
  private getEnvironmentCompletions(textBeforeCursor: string): AutocompleteItem[] {
    const match = textBeforeCursor.match(/\\(?:begin|end)\{([a-zA-Z]*)$/);
    if (!match) return [];

    const prefix = match[1].toLowerCase();

    return LATEX_ENVIRONMENTS
      .filter(item => item.label.toLowerCase().includes(prefix))
      .sort((a, b) => (b.sortPriority || 0) - (a.sortPriority || 0));
  }

  /**
   * Get math symbol completions.
   */
  private getMathCompletions(textBeforeCursor: string): AutocompleteItem[] {
    const match = textBeforeCursor.match(/\\([a-zA-Z]*)$/);
    if (!match) return [];

    const prefix = match[1].toLowerCase();

    return MATH_SYMBOLS
      .filter(item => item.label.toLowerCase().includes(prefix))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Get citation completions from document bibliography.
   */
  private getCitationCompletions(): AutocompleteItem[] {
    return Array.from(this.documentCitations).map(cite => ({
      label: cite,
      insertText: cite,
      kind: CompletionKind.Citation,
      detail: 'Citation',
    }));
  }

  /**
   * Get reference completions from document labels.
   */
  private getReferenceCompletions(): AutocompleteItem[] {
    return Array.from(this.documentLabels).map(label => ({
      label: label,
      insertText: label,
      kind: CompletionKind.Reference,
      detail: 'Label reference',
    }));
  }

  /**
   * Extract citations from document.
   */
  extractCitations(documentContent: string): void {
    const citePattern = /\\bibitem\{([^}]+)\}/g;
    let match;

    this.documentCitations.clear();
    while ((match = citePattern.exec(documentContent)) !== null) {
      this.documentCitations.add(match[1]);
    }
  }

  /**
   * Extract labels from document.
   */
  extractLabels(documentContent: string): void {
    const labelPattern = /\\label\{([^}]+)\}/g;
    let match;

    this.documentLabels.clear();
    while ((match = labelPattern.exec(documentContent)) !== null) {
      this.documentLabels.add(match[1]);
    }
  }

  /**
   * Add custom snippet.
   */
  addCustomSnippet(item: AutocompleteItem): void {
    this.customSnippets.set(item.label, item);
  }

  /**
   * Track recently used commands for smart suggestions.
   */
  recordCommand(command: string): void {
    this.recentCommands.unshift(command);
    if (this.recentCommands.length > 50) {
      this.recentCommands.pop();
    }
  }

  /**
   * Get frequently used commands.
   */
  getFrequentCommands(limit: number = 10): AutocompleteItem[] {
    const frequency = new Map<string, number>();

    for (const cmd of this.recentCommands) {
      frequency.set(cmd, (frequency.get(cmd) || 0) + 1);
    }

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cmd]) => ({
        label: cmd,
        insertText: cmd,
        kind: CompletionKind.Command,
        detail: 'Recently used',
        sortPriority: 15,
      }));
  }
}

/**
 * Create default autocomplete engine instance.
 */
export function createAutocompleteEngine(): LatexAutocomplete {
  return new LatexAutocomplete();
}
