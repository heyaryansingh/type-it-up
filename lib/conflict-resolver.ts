/**
 * Real-time collaboration conflict resolution for LaTeX documents.
 *
 * Handles concurrent edits using Operational Transformation (OT) and
 * provides intelligent merge strategies for LaTeX-specific conflicts.
 */

export interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
  userId: string;
  timestamp: number;
}

export interface DocumentState {
  content: string;
  version: number;
  lastModified: Date;
  checksum: string;
}

export interface ConflictResolution {
  resolved: string;
  strategy: MergeStrategy;
  conflicts: Conflict[];
  autoResolved: number;
  manualRequired: number;
}

export interface Conflict {
  type: ConflictType;
  position: number;
  localChange: string;
  remoteChange: string;
  context: string;
  severity: 'low' | 'medium' | 'high';
  suggestedResolution?: string;
}

export enum ConflictType {
  OVERLAPPING_EDIT = 'overlapping_edit',
  STRUCTURAL_CHANGE = 'structural_change',
  CITATION_CONFLICT = 'citation_conflict',
  EQUATION_MODIFICATION = 'equation_modification',
  FORMATTING_CLASH = 'formatting_clash',
}

export enum MergeStrategy {
  AUTO_MERGE = 'auto_merge',
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  MANUAL = 'manual',
  SMART_LATEX = 'smart_latex',
}

export class ConflictResolver {
  private pendingOperations: TextOperation[] = [];
  private documentState: DocumentState;

  constructor(initialContent: string) {
    this.documentState = {
      content: initialContent,
      version: 0,
      lastModified: new Date(),
      checksum: this.calculateChecksum(initialContent),
    };
  }

  /**
   * Apply operation with conflict detection.
   */
  applyOperation(operation: TextOperation): ConflictResolution {
    const conflicts: Conflict[] = [];

    // Check for conflicts with pending operations
    for (const pendingOp of this.pendingOperations) {
      const conflict = this.detectConflict(operation, pendingOp);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    let resolved: string;
    let strategy: MergeStrategy;

    if (conflicts.length === 0) {
      // No conflicts, apply directly
      resolved = this.applyOperationDirect(operation);
      strategy = MergeStrategy.AUTO_MERGE;
    } else {
      // Resolve conflicts
      const resolution = this.resolveConflicts(conflicts, operation);
      resolved = resolution.content;
      strategy = resolution.strategy;
    }

    // Update state
    this.documentState.content = resolved;
    this.documentState.version++;
    this.documentState.lastModified = new Date();
    this.documentState.checksum = this.calculateChecksum(resolved);

    return {
      resolved,
      strategy,
      conflicts,
      autoResolved: conflicts.filter(c => c.suggestedResolution).length,
      manualRequired: conflicts.filter(c => !c.suggestedResolution).length,
    };
  }

  /**
   * Detect conflict between two operations.
   */
  private detectConflict(
    op1: TextOperation,
    op2: TextOperation
  ): Conflict | null {
    // Check for overlapping positions
    const op1End = op1.position + (op1.length || op1.content?.length || 0);
    const op2End = op2.position + (op2.length || op2.content?.length || 0);

    const overlaps =
      (op1.position >= op2.position && op1.position < op2End) ||
      (op2.position >= op1.position && op2.position < op1End);

    if (!overlaps) return null;

    // Get context around conflict
    const contextStart = Math.max(0, op1.position - 50);
    const contextEnd = Math.min(
      this.documentState.content.length,
      op1End + 50
    );
    const context = this.documentState.content.substring(contextStart, contextEnd);

    // Determine conflict type and severity
    const type = this.classifyConflictType(context, op1, op2);
    const severity = this.assessSeverity(type, op1, op2);

    // Generate suggested resolution for LaTeX-specific conflicts
    const suggestedResolution = this.suggestResolution(type, op1, op2, context);

    return {
      type,
      position: op1.position,
      localChange: this.getChangeDescription(op1),
      remoteChange: this.getChangeDescription(op2),
      context,
      severity,
      suggestedResolution,
    };
  }

  /**
   * Classify type of conflict based on context.
   */
  private classifyConflictType(
    context: string,
    op1: TextOperation,
    op2: TextOperation
  ): ConflictType {
    // Check for LaTeX structural elements
    if (
      context.includes('\\begin{') ||
      context.includes('\\end{') ||
      context.includes('\\section')
    ) {
      return ConflictType.STRUCTURAL_CHANGE;
    }

    if (context.includes('\\cite') || context.includes('\\ref')) {
      return ConflictType.CITATION_CONFLICT;
    }

    if (
      context.includes('\\[') ||
      context.includes('\\]') ||
      context.includes('\\begin{equation}')
    ) {
      return ConflictType.EQUATION_MODIFICATION;
    }

    if (
      context.includes('\\textbf') ||
      context.includes('\\emph') ||
      context.includes('\\textit')
    ) {
      return ConflictType.FORMATTING_CLASH;
    }

    return ConflictType.OVERLAPPING_EDIT;
  }

  /**
   * Assess conflict severity.
   */
  private assessSeverity(
    type: ConflictType,
    op1: TextOperation,
    op2: TextOperation
  ): 'low' | 'medium' | 'high' {
    if (type === ConflictType.STRUCTURAL_CHANGE) return 'high';
    if (type === ConflictType.EQUATION_MODIFICATION) return 'high';
    if (type === ConflictType.CITATION_CONFLICT) return 'medium';

    // Check size of changes
    const change1Size = op1.content?.length || op1.length || 0;
    const change2Size = op2.content?.length || op2.length || 0;

    if (change1Size > 100 || change2Size > 100) return 'high';
    if (change1Size > 20 || change2Size > 20) return 'medium';

    return 'low';
  }

  /**
   * Suggest resolution for LaTeX-specific conflicts.
   */
  private suggestResolution(
    type: ConflictType,
    op1: TextOperation,
    op2: TextOperation,
    context: string
  ): string | undefined {
    switch (type) {
      case ConflictType.FORMATTING_CLASH:
        // Combine formatting commands
        if (op1.content && op2.content) {
          return this.mergeFormatting(op1.content, op2.content);
        }
        break;

      case ConflictType.CITATION_CONFLICT:
        // Merge citations
        if (op1.content && op2.content) {
          return this.mergeCitations(op1.content, op2.content);
        }
        break;

      case ConflictType.OVERLAPPING_EDIT:
        // Use timestamp to decide
        if (op1.timestamp > op2.timestamp) {
          return op1.content;
        } else {
          return op2.content;
        }

      default:
        return undefined;
    }
  }

  /**
   * Merge formatting commands intelligently.
   */
  private mergeFormatting(local: string, remote: string): string {
    // Extract formatting commands
    const localCommands = this.extractCommands(local);
    const remoteCommands = this.extractCommands(remote);

    // Combine unique commands
    const allCommands = [...new Set([...localCommands, ...remoteCommands])];

    // Get text content (strip commands)
    const text =
      local.replace(/\\[a-z]+{([^}]+)}/gi, '$1') ||
      remote.replace(/\\[a-z]+{([^}]+)}/gi, '$1');

    // Nest commands
    let result = text;
    allCommands.forEach(cmd => {
      result = `\\${cmd}{${result}}`;
    });

    return result;
  }

  /**
   * Merge citation lists.
   */
  private mergeCitations(local: string, remote: string): string {
    // Extract citation keys
    const localKeys = this.extractCitationKeys(local);
    const remoteKeys = this.extractCitationKeys(remote);

    // Combine and deduplicate
    const allKeys = [...new Set([...localKeys, ...remoteKeys])];

    // Reconstruct citation command
    if (allKeys.length === 0) return local;

    return `\\cite{${allKeys.join(',')}}`;
  }

  /**
   * Extract LaTeX commands from text.
   */
  private extractCommands(text: string): string[] {
    const regex = /\\([a-z]+){/gi;
    const matches = text.matchAll(regex);
    return Array.from(matches, m => m[1]);
  }

  /**
   * Extract citation keys.
   */
  private extractCitationKeys(text: string): string[] {
    const match = text.match(/\\cite{([^}]+)}/);
    if (!match) return [];
    return match[1].split(',').map(k => k.trim());
  }

  /**
   * Resolve conflicts using appropriate strategy.
   */
  private resolveConflicts(
    conflicts: Conflict[],
    operation: TextOperation
  ): { content: string; strategy: MergeStrategy } {
    // Try auto-resolution first
    const autoResolvable = conflicts.every(c => c.suggestedResolution);

    if (autoResolvable) {
      let content = this.documentState.content;

      // Apply suggested resolutions in reverse order (by position)
      const sorted = [...conflicts].sort((a, b) => b.position - a.position);

      for (const conflict of sorted) {
        if (conflict.suggestedResolution) {
          content = this.applySuggestedResolution(content, conflict);
        }
      }

      return { content, strategy: MergeStrategy.SMART_LATEX };
    }

    // High severity conflicts require manual resolution
    const hasHighSeverity = conflicts.some(c => c.severity === 'high');
    if (hasHighSeverity) {
      return {
        content: this.createConflictMarkers(conflicts),
        strategy: MergeStrategy.MANUAL,
      };
    }

    // Use timestamp-based resolution for medium/low severity
    return {
      content: this.applyOperationDirect(operation),
      strategy: MergeStrategy.AUTO_MERGE,
    };
  }

  /**
   * Apply suggested resolution to content.
   */
  private applySuggestedResolution(
    content: string,
    conflict: Conflict
  ): string {
    if (!conflict.suggestedResolution) return content;

    // Replace conflict area with suggested resolution
    const before = content.substring(0, conflict.position);
    const after = content.substring(
      conflict.position + conflict.localChange.length
    );

    return before + conflict.suggestedResolution + after;
  }

  /**
   * Create conflict markers for manual resolution.
   */
  private createConflictMarkers(conflicts: Conflict[]): string {
    let content = this.documentState.content;

    // Add conflict markers in reverse order
    const sorted = [...conflicts].sort((a, b) => b.position - a.position);

    for (const conflict of sorted) {
      const marker = `
% <<<<<<< LOCAL (${conflict.type})
${conflict.localChange}
% =======
${conflict.remoteChange}
% >>>>>>> REMOTE
`;

      const before = content.substring(0, conflict.position);
      const after = content.substring(
        conflict.position + conflict.localChange.length
      );

      content = before + marker + after;
    }

    return content;
  }

  /**
   * Apply operation directly without conflicts.
   */
  private applyOperationDirect(operation: TextOperation): string {
    const content = this.documentState.content;

    switch (operation.type) {
      case 'insert':
        return (
          content.substring(0, operation.position) +
          (operation.content || '') +
          content.substring(operation.position)
        );

      case 'delete':
        return (
          content.substring(0, operation.position) +
          content.substring(operation.position + (operation.length || 0))
        );

      case 'retain':
        return content;

      default:
        return content;
    }
  }

  /**
   * Get human-readable description of change.
   */
  private getChangeDescription(operation: TextOperation): string {
    switch (operation.type) {
      case 'insert':
        return operation.content || '';
      case 'delete':
        return `[deleted ${operation.length} chars]`;
      case 'retain':
        return '[no change]';
      default:
        return '';
    }
  }

  /**
   * Calculate checksum for content integrity.
   */
  private calculateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Transform operation against another operation (OT).
   */
  transform(
    op1: TextOperation,
    op2: TextOperation
  ): TextOperation {
    const transformed = { ...op1 };

    // If op2 was before op1, adjust op1's position
    if (op2.position < op1.position) {
      if (op2.type === 'insert') {
        transformed.position += op2.content?.length || 0;
      } else if (op2.type === 'delete') {
        transformed.position -= op2.length || 0;
      }
    }

    return transformed;
  }

  /**
   * Get current document state.
   */
  getState(): DocumentState {
    return { ...this.documentState };
  }
}

/**
 * Batch resolve multiple conflicts with prioritization.
 */
export function batchResolveConflicts(
  conflicts: Conflict[]
): ConflictResolution {
  // Sort by severity and position
  const sorted = conflicts.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.position - b.position;
  });

  const autoResolved = sorted.filter(c => c.suggestedResolution);
  const manualRequired = sorted.filter(c => !c.suggestedResolution);

  let resolved = '';
  for (const conflict of autoResolved) {
    resolved += conflict.suggestedResolution + '\n';
  }

  return {
    resolved,
    strategy:
      manualRequired.length > 0
        ? MergeStrategy.MANUAL
        : MergeStrategy.SMART_LATEX,
    conflicts: sorted,
    autoResolved: autoResolved.length,
    manualRequired: manualRequired.length,
  };
}
