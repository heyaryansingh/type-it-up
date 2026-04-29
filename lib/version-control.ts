/**
 * Document version control and history management
 * Tracks changes, enables rollback, and provides diff visualization
 */

export interface DocumentVersion {
  id: string;
  content: string;
  timestamp: Date;
  author?: string;
  message?: string;
  hash: string;
  parentId?: string;
}

export interface VersionDiff {
  additions: number;
  deletions: number;
  changes: Array<{
    type: 'add' | 'delete' | 'modify';
    position: number;
    oldText?: string;
    newText?: string;
  }>;
}

export interface VersionHistory {
  versions: DocumentVersion[];
  currentVersionId: string;
  branches: Map<string, string>; // branch name -> version id
}

/**
 * Simple hash function for content
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calculate diff between two versions
 */
export function calculateDiff(
  oldContent: string,
  newContent: string
): VersionDiff {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const changes: VersionDiff['changes'] = [];
  let additions = 0;
  let deletions = 0;

  const maxLength = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      // Addition
      changes.push({
        type: 'add',
        position: i,
        newText: newLine
      });
      additions++;
    } else if (oldLine !== undefined && newLine === undefined) {
      // Deletion
      changes.push({
        type: 'delete',
        position: i,
        oldText: oldLine
      });
      deletions++;
    } else if (oldLine !== newLine) {
      // Modification
      changes.push({
        type: 'modify',
        position: i,
        oldText: oldLine,
        newText: newLine
      });
      additions++;
      deletions++;
    }
  }

  return { additions, deletions, changes };
}

/**
 * Version control manager for documents
 */
export class VersionControl {
  private history: VersionHistory;
  private maxVersions: number;

  constructor(maxVersions = 50) {
    this.history = {
      versions: [],
      currentVersionId: '',
      branches: new Map()
    };
    this.maxVersions = maxVersions;
  }

  /**
   * Create a new version
   */
  createVersion(
    content: string,
    message?: string,
    author?: string
  ): DocumentVersion {
    const id = `v${Date.now()}`;
    const hash = hashContent(content);

    const version: DocumentVersion = {
      id,
      content,
      timestamp: new Date(),
      hash,
      message,
      author,
      parentId: this.history.currentVersionId || undefined
    };

    this.history.versions.push(version);
    this.history.currentVersionId = id;

    // Prune old versions if exceeding max
    if (this.history.versions.length > this.maxVersions) {
      this.history.versions = this.history.versions.slice(-this.maxVersions);
    }

    return version;
  }

  /**
   * Get a specific version
   */
  getVersion(versionId: string): DocumentVersion | undefined {
    return this.history.versions.find(v => v.id === versionId);
  }

  /**
   * Get current version
   */
  getCurrentVersion(): DocumentVersion | undefined {
    return this.getVersion(this.history.currentVersionId);
  }

  /**
   * Rollback to a previous version
   */
  rollback(versionId: string): DocumentVersion | null {
    const version = this.getVersion(versionId);
    if (!version) {
      return null;
    }

    // Create a new version based on the old content
    return this.createVersion(
      version.content,
      `Rollback to ${versionId}`,
      'system'
    );
  }

  /**
   * Get version history
   */
  getHistory(): DocumentVersion[] {
    return [...this.history.versions].reverse(); // Most recent first
  }

  /**
   * Get diff between two versions
   */
  getDiff(fromVersionId: string, toVersionId: string): VersionDiff | null {
    const fromVersion = this.getVersion(fromVersionId);
    const toVersion = this.getVersion(toVersionId);

    if (!fromVersion || !toVersion) {
      return null;
    }

    return calculateDiff(fromVersion.content, toVersion.content);
  }

  /**
   * Create a branch
   */
  createBranch(branchName: string, fromVersionId?: string): boolean {
    const versionId = fromVersionId || this.history.currentVersionId;

    if (!this.getVersion(versionId)) {
      return false;
    }

    this.history.branches.set(branchName, versionId);
    return true;
  }

  /**
   * Switch to a branch
   */
  switchBranch(branchName: string): boolean {
    const versionId = this.history.branches.get(branchName);

    if (!versionId) {
      return false;
    }

    this.history.currentVersionId = versionId;
    return true;
  }

  /**
   * List all branches
   */
  listBranches(): Array<{ name: string; versionId: string }> {
    return Array.from(this.history.branches.entries()).map(([name, versionId]) => ({
      name,
      versionId
    }));
  }

  /**
   * Export history as JSON
   */
  exportHistory(): string {
    return JSON.stringify({
      versions: this.history.versions.map(v => ({
        ...v,
        timestamp: v.timestamp.toISOString()
      })),
      currentVersionId: this.history.currentVersionId,
      branches: Array.from(this.history.branches.entries())
    }, null, 2);
  }

  /**
   * Import history from JSON
   */
  importHistory(json: string): boolean {
    try {
      const data = JSON.parse(json);

      this.history.versions = data.versions.map((v: any) => ({
        ...v,
        timestamp: new Date(v.timestamp)
      }));
      this.history.currentVersionId = data.currentVersionId;
      this.history.branches = new Map(data.branches);

      return true;
    } catch (error) {
      console.error('Failed to import history:', error);
      return false;
    }
  }

  /**
   * Get statistics about version history
   */
  getStatistics() {
    const versions = this.history.versions;

    if (versions.length === 0) {
      return {
        totalVersions: 0,
        totalBranches: 0,
        oldestVersion: null,
        newestVersion: null,
        averageChangesPerVersion: 0
      };
    }

    return {
      totalVersions: versions.length,
      totalBranches: this.history.branches.size,
      oldestVersion: versions[0].timestamp,
      newestVersion: versions[versions.length - 1].timestamp,
      averageChangesPerVersion: this.calculateAverageChanges()
    };
  }

  private calculateAverageChanges(): number {
    const versions = this.history.versions;
    if (versions.length < 2) return 0;

    let totalChanges = 0;
    for (let i = 1; i < versions.length; i++) {
      const diff = calculateDiff(versions[i - 1].content, versions[i].content);
      totalChanges += diff.additions + diff.deletions;
    }

    return totalChanges / (versions.length - 1);
  }

  /**
   * Clean up old versions
   */
  cleanup(keepVersions = 10): number {
    const removed = this.history.versions.length - keepVersions;

    if (removed > 0) {
      this.history.versions = this.history.versions.slice(-keepVersions);
    }

    return Math.max(0, removed);
  }
}

/**
 * Create a version control instance
 */
export function createVersionControl(maxVersions = 50): VersionControl {
  return new VersionControl(maxVersions);
}
