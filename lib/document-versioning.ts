/**
 * Document versioning and history management for Type-It-Up.
 * Tracks changes, enables rollback, and provides diff visualization.
 */

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  latex?: string;
  markdown?: string;
  timestamp: Date;
  author?: string;
  message?: string;
  changes?: VersionChanges;
}

export interface VersionChanges {
  linesAdded: number;
  linesRemoved: number;
  linesModified: number;
  totalChanges: number;
}

export interface DiffResult {
  additions: DiffLine[];
  deletions: DiffLine[];
  modifications: DiffLine[];
}

export interface DiffLine {
  lineNumber: number;
  content: string;
  type: 'add' | 'delete' | 'modify';
}

/**
 * Version control manager for documents
 */
export class DocumentVersionControl {
  private versions: Map<string, DocumentVersion[]> = new Map();
  private maxVersionsPerDocument: number = 50;

  constructor(maxVersions: number = 50) {
    this.maxVersionsPerDocument = maxVersions;
  }

  /**
   * Create a new version of a document
   */
  createVersion(
    documentId: string,
    content: string,
    latex?: string,
    markdown?: string,
    message?: string,
    author?: string
  ): DocumentVersion {
    const versions = this.versions.get(documentId) || [];
    const previousVersion = versions[versions.length - 1];

    const newVersion: DocumentVersion = {
      id: `${documentId}-v${versions.length + 1}`,
      documentId,
      version: versions.length + 1,
      content,
      latex,
      markdown,
      timestamp: new Date(),
      author,
      message: message || `Version ${versions.length + 1}`,
    };

    // Calculate changes if there's a previous version
    if (previousVersion) {
      newVersion.changes = this.calculateChanges(
        previousVersion.content,
        content
      );
    }

    versions.push(newVersion);

    // Limit version history
    if (versions.length > this.maxVersionsPerDocument) {
      versions.shift();
    }

    this.versions.set(documentId, versions);

    return newVersion;
  }

  /**
   * Get all versions for a document
   */
  getVersions(documentId: string): DocumentVersion[] {
    return this.versions.get(documentId) || [];
  }

  /**
   * Get a specific version by version number
   */
  getVersion(documentId: string, version: number): DocumentVersion | null {
    const versions = this.versions.get(documentId) || [];
    return versions.find(v => v.version === version) || null;
  }

  /**
   * Get the latest version of a document
   */
  getLatestVersion(documentId: string): DocumentVersion | null {
    const versions = this.versions.get(documentId) || [];
    return versions[versions.length - 1] || null;
  }

  /**
   * Rollback to a specific version
   */
  rollbackToVersion(
    documentId: string,
    targetVersion: number,
    message?: string
  ): DocumentVersion | null {
    const version = this.getVersion(documentId, targetVersion);

    if (!version) {
      return null;
    }

    // Create a new version with the content from the target version
    return this.createVersion(
      documentId,
      version.content,
      version.latex,
      version.markdown,
      message || `Rolled back to version ${targetVersion}`,
      version.author
    );
  }

  /**
   * Calculate changes between two versions
   */
  private calculateChanges(oldContent: string, newContent: string): VersionChanges {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    const diff = this.computeLineDiff(oldLines, newLines);

    return {
      linesAdded: diff.additions.length,
      linesRemoved: diff.deletions.length,
      linesModified: diff.modifications.length,
      totalChanges: diff.additions.length + diff.deletions.length + diff.modifications.length,
    };
  }

  /**
   * Compute line-by-line diff between two versions
   */
  computeLineDiff(oldLines: string[], newLines: string[]): DiffResult {
    const additions: DiffLine[] = [];
    const deletions: DiffLine[] = [];
    const modifications: DiffLine[] = [];

    // Simple line-based diff algorithm
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    // Find additions
    newLines.forEach((line, index) => {
      if (!oldSet.has(line)) {
        additions.push({
          lineNumber: index + 1,
          content: line,
          type: 'add',
        });
      }
    });

    // Find deletions
    oldLines.forEach((line, index) => {
      if (!newSet.has(line)) {
        deletions.push({
          lineNumber: index + 1,
          content: line,
          type: 'delete',
        });
      }
    });

    // Find modifications (lines that exist in both but at different positions)
    // This is a simplified approach
    const commonLines = oldLines.filter(line => newSet.has(line));
    const movedLines = commonLines.filter((line, oldIndex) => {
      const newIndex = newLines.indexOf(line);
      return newIndex !== -1 && newIndex !== oldIndex;
    });

    movedLines.forEach((line, index) => {
      modifications.push({
        lineNumber: oldLines.indexOf(line) + 1,
        content: line,
        type: 'modify',
      });
    });

    return { additions, deletions, modifications };
  }

  /**
   * Compare two specific versions
   */
  compareVersions(
    documentId: string,
    version1: number,
    version2: number
  ): DiffResult | null {
    const v1 = this.getVersion(documentId, version1);
    const v2 = this.getVersion(documentId, version2);

    if (!v1 || !v2) {
      return null;
    }

    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');

    return this.computeLineDiff(lines1, lines2);
  }

  /**
   * Get version history summary
   */
  getVersionHistory(documentId: string): VersionHistorySummary {
    const versions = this.getVersions(documentId);

    return {
      documentId,
      totalVersions: versions.length,
      oldestVersion: versions[0]?.timestamp,
      latestVersion: versions[versions.length - 1]?.timestamp,
      totalChanges: versions.reduce(
        (sum, v) => sum + (v.changes?.totalChanges || 0),
        0
      ),
      versions: versions.map(v => ({
        version: v.version,
        timestamp: v.timestamp,
        message: v.message,
        author: v.author,
        changes: v.changes,
      })),
    };
  }

  /**
   * Auto-save with versioning
   */
  autoSave(
    documentId: string,
    content: string,
    latex?: string,
    markdown?: string,
    minChangeThreshold: number = 10
  ): DocumentVersion | null {
    const latestVersion = this.getLatestVersion(documentId);

    if (!latestVersion) {
      return this.createVersion(
        documentId,
        content,
        latex,
        markdown,
        'Initial version',
        'auto-save'
      );
    }

    // Calculate changes
    const changes = this.calculateChanges(latestVersion.content, content);

    // Only create new version if changes exceed threshold
    if (changes.totalChanges >= minChangeThreshold) {
      return this.createVersion(
        documentId,
        content,
        latex,
        markdown,
        `Auto-save: ${changes.totalChanges} changes`,
        'auto-save'
      );
    }

    return null;
  }

  /**
   * Export version history as JSON
   */
  exportVersionHistory(documentId: string): string {
    const history = this.getVersionHistory(documentId);
    return JSON.stringify(history, null, 2);
  }

  /**
   * Import version history from JSON
   */
  importVersionHistory(jsonData: string): boolean {
    try {
      const history: VersionHistorySummary = JSON.parse(jsonData);

      // Reconstruct versions array
      const versions: DocumentVersion[] = history.versions.map((v, index) => ({
        id: `${history.documentId}-v${v.version}`,
        documentId: history.documentId,
        version: v.version,
        content: '', // Content needs to be provided separately
        timestamp: new Date(v.timestamp),
        author: v.author,
        message: v.message,
        changes: v.changes,
      }));

      this.versions.set(history.documentId, versions);

      return true;
    } catch (error) {
      console.error('Failed to import version history:', error);
      return false;
    }
  }

  /**
   * Clear version history for a document
   */
  clearVersionHistory(documentId: string): void {
    this.versions.delete(documentId);
  }

  /**
   * Get storage size estimate for version history
   */
  getStorageSize(documentId: string): number {
    const versions = this.getVersions(documentId);

    return versions.reduce((total, version) => {
      return total +
        version.content.length +
        (version.latex?.length || 0) +
        (version.markdown?.length || 0);
    }, 0);
  }
}

export interface VersionHistorySummary {
  documentId: string;
  totalVersions: number;
  oldestVersion?: Date;
  latestVersion?: Date;
  totalChanges: number;
  versions: {
    version: number;
    timestamp: Date;
    message?: string;
    author?: string;
    changes?: VersionChanges;
  }[];
}

/**
 * Utility function to format diff output for display
 */
export function formatDiffForDisplay(diff: DiffResult): string {
  let output = '';

  if (diff.deletions.length > 0) {
    output += '--- Deletions ---\n';
    diff.deletions.forEach(line => {
      output += `- Line ${line.lineNumber}: ${line.content}\n`;
    });
    output += '\n';
  }

  if (diff.additions.length > 0) {
    output += '+++ Additions +++\n';
    diff.additions.forEach(line => {
      output += `+ Line ${line.lineNumber}: ${line.content}\n`;
    });
    output += '\n';
  }

  if (diff.modifications.length > 0) {
    output += '~~~ Modifications ~~~\n';
    diff.modifications.forEach(line => {
      output += `~ Line ${line.lineNumber}: ${line.content}\n`;
    });
  }

  return output;
}

/**
 * Create a singleton instance for global use
 */
export const globalVersionControl = new DocumentVersionControl();
