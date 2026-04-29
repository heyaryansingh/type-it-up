/**
 * Real-time collaboration utilities for multi-user document editing
 * Handles presence, cursors, and operational transformation
 */

export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  lastSeen: Date;
}

export interface CursorPosition {
  line: number;
  column: number;
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface Operation {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
}

export interface Presence {
  users: Map<string, User>;
  activeUsers: Set<string>;
}

/**
 * Generates a random color for user avatars
 */
function generateUserColor(): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Operational Transformation for concurrent edits
 */
export class OperationalTransform {
  /**
   * Transform operation A against operation B
   * Returns transformed operation A'
   */
  static transform(opA: Operation, opB: Operation): Operation {
    // If operations don't conflict, return original
    if (opA.position > opB.position + (opB.length || 0)) {
      return opA;
    }

    const transformedOp = { ...opA };

    if (opB.type === 'insert') {
      // Shift position right if insert happened before
      if (opB.position <= opA.position) {
        transformedOp.position += opB.content?.length || 0;
      }
    } else if (opB.type === 'delete') {
      // Shift position left if delete happened before
      if (opB.position < opA.position) {
        transformedOp.position -= Math.min(
          opB.length || 0,
          opA.position - opB.position
        );
      }
    }

    return transformedOp;
  }

  /**
   * Apply operation to content
   */
  static apply(content: string, operation: Operation): string {
    switch (operation.type) {
      case 'insert':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position)
        );

      case 'delete':
        return (
          content.slice(0, operation.position) +
          content.slice(operation.position + (operation.length || 0))
        );

      case 'replace':
        return (
          content.slice(0, operation.position) +
          (operation.content || '') +
          content.slice(operation.position + (operation.length || 0))
        );

      default:
        return content;
    }
  }
}

/**
 * Collaboration session manager
 */
export class CollaborationSession {
  private presence: Presence;
  private operations: Operation[];
  private content: string;
  private operationIndex: number;

  constructor(initialContent = '') {
    this.presence = {
      users: new Map(),
      activeUsers: new Set()
    };
    this.operations = [];
    this.content = initialContent;
    this.operationIndex = 0;
  }

  /**
   * Add a user to the session
   */
  addUser(userId: string, name: string): User {
    const user: User = {
      id: userId,
      name,
      color: generateUserColor(),
      lastSeen: new Date()
    };

    this.presence.users.set(userId, user);
    this.presence.activeUsers.add(userId);

    return user;
  }

  /**
   * Remove a user from the session
   */
  removeUser(userId: string): boolean {
    this.presence.activeUsers.delete(userId);
    return this.presence.users.delete(userId);
  }

  /**
   * Update user cursor position
   */
  updateCursor(userId: string, cursor: CursorPosition): boolean {
    const user = this.presence.users.get(userId);

    if (!user) {
      return false;
    }

    user.cursor = cursor;
    user.lastSeen = new Date();
    this.presence.users.set(userId, user);

    return true;
  }

  /**
   * Get all active users
   */
  getActiveUsers(): User[] {
    return Array.from(this.presence.activeUsers)
      .map(id => this.presence.users.get(id))
      .filter((user): user is User => user !== undefined);
  }

  /**
   * Apply a new operation
   */
  applyOperation(operation: Operation): string {
    // Transform against all operations since this client's last sync
    let transformedOp = operation;

    for (let i = this.operationIndex; i < this.operations.length; i++) {
      transformedOp = OperationalTransform.transform(
        transformedOp,
        this.operations[i]
      );
    }

    // Apply the transformed operation
    this.content = OperationalTransform.apply(this.content, transformedOp);
    this.operations.push(transformedOp);
    this.operationIndex = this.operations.length;

    return this.content;
  }

  /**
   * Get current content
   */
  getContent(): string {
    return this.content;
  }

  /**
   * Get operation history
   */
  getOperations(): Operation[] {
    return [...this.operations];
  }

  /**
   * Sync operations from a specific index
   */
  syncOperations(fromIndex: number): Operation[] {
    return this.operations.slice(fromIndex);
  }

  /**
   * Get collaboration statistics
   */
  getStatistics() {
    const users = this.getActiveUsers();

    return {
      totalUsers: this.presence.users.size,
      activeUsers: this.presence.activeUsers.size,
      totalOperations: this.operations.length,
      operationsByUser: this.getOperationsByUser(),
      contentLength: this.content.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        lastSeen: u.lastSeen,
        hasActiveCursor: !!u.cursor
      }))
    };
  }

  private getOperationsByUser(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const op of this.operations) {
      counts[op.userId] = (counts[op.userId] || 0) + 1;
    }

    return counts;
  }

  /**
   * Cleanup inactive users
   */
  cleanupInactiveUsers(timeoutMinutes = 5): number {
    const now = new Date();
    const timeout = timeoutMinutes * 60 * 1000;
    let removed = 0;

    for (const [userId, user] of this.presence.users) {
      const inactive = now.getTime() - user.lastSeen.getTime() > timeout;

      if (inactive) {
        this.removeUser(userId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Create an operation
   */
  createOperation(
    userId: string,
    type: Operation['type'],
    position: number,
    content?: string,
    length?: number
  ): Operation {
    return {
      id: `op${Date.now()}_${userId}`,
      userId,
      timestamp: new Date(),
      type,
      position,
      content,
      length
    };
  }

  /**
   * Export session state
   */
  exportState() {
    return {
      content: this.content,
      operations: this.operations.map(op => ({
        ...op,
        timestamp: op.timestamp.toISOString()
      })),
      users: Array.from(this.presence.users.values()).map(u => ({
        ...u,
        lastSeen: u.lastSeen.toISOString()
      })),
      activeUsers: Array.from(this.presence.activeUsers)
    };
  }
}

/**
 * Create a collaboration session
 */
export function createCollaborationSession(
  initialContent = ''
): CollaborationSession {
  return new CollaborationSession(initialContent);
}

/**
 * Merge cursor positions for visualization
 */
export function mergeCursorPositions(
  users: User[]
): Array<{ userId: string; name: string; color: string; cursor: CursorPosition }> {
  return users
    .filter(u => u.cursor)
    .map(u => ({
      userId: u.id,
      name: u.name,
      color: u.color,
      cursor: u.cursor!
    }));
}
