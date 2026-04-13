/**
 * @fileoverview Keyboard shortcuts management for type-it-up.
 *
 * Provides a centralized system for registering, managing, and handling
 * keyboard shortcuts across the application with conflict detection.
 *
 * @module lib/keyboard-shortcuts
 *
 * @example
 * ```typescript
 * import { ShortcutManager, defaultShortcuts } from '@/lib/keyboard-shortcuts';
 *
 * const manager = new ShortcutManager();
 * manager.registerShortcuts(defaultShortcuts);
 * manager.enable();
 * ```
 */

/**
 * Modifier keys that can be combined with other keys.
 */
export type ModifierKey = "ctrl" | "alt" | "shift" | "meta";

/**
 * Represents a keyboard shortcut binding.
 */
export interface ShortcutBinding {
  /** Primary key (e.g., 's', 'Enter', 'Escape') */
  key: string;
  /** Required modifier keys */
  modifiers: ModifierKey[];
  /** Human-readable description */
  description: string;
  /** Category for grouping in UI */
  category: ShortcutCategory;
  /** Handler function to execute */
  handler: () => void;
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
}

/**
 * Categories for organizing shortcuts.
 */
export type ShortcutCategory =
  | "navigation"
  | "editing"
  | "file"
  | "view"
  | "ocr"
  | "export";

/**
 * Configuration for the shortcut manager.
 */
export interface ShortcutManagerConfig {
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** Elements to ignore shortcuts in (e.g., inputs) */
  ignoreElements?: string[];
}

/**
 * Format a shortcut binding as a display string.
 *
 * @param binding - The shortcut binding to format
 * @returns Human-readable shortcut string (e.g., "Ctrl+S")
 *
 * @example
 * ```typescript
 * const shortcut = { key: 's', modifiers: ['ctrl'], ... };
 * formatShortcut(shortcut); // "Ctrl+S"
 * ```
 */
export function formatShortcut(binding: ShortcutBinding): string {
  const modifierLabels: Record<ModifierKey, string> = {
    ctrl: "Ctrl",
    alt: "Alt",
    shift: "Shift",
    meta: "⌘",
  };

  const parts = binding.modifiers.map((mod) => modifierLabels[mod]);
  parts.push(binding.key.toUpperCase());

  return parts.join("+");
}

/**
 * Parse a shortcut string into its components.
 *
 * @param shortcutString - Shortcut string (e.g., "Ctrl+Shift+S")
 * @returns Object with key and modifiers
 *
 * @example
 * ```typescript
 * parseShortcut("Ctrl+Shift+S"); // { key: 's', modifiers: ['ctrl', 'shift'] }
 * ```
 */
export function parseShortcut(shortcutString: string): {
  key: string;
  modifiers: ModifierKey[];
} {
  const parts = shortcutString.toLowerCase().split("+");
  const key = parts.pop() || "";
  const modifiers = parts.filter((p): p is ModifierKey =>
    ["ctrl", "alt", "shift", "meta"].includes(p)
  );

  return { key, modifiers };
}

/**
 * Check if a keyboard event matches a shortcut binding.
 *
 * @param event - The keyboard event to check
 * @param binding - The shortcut binding to match against
 * @returns True if the event matches the binding
 */
export function matchesShortcut(
  event: KeyboardEvent,
  binding: ShortcutBinding
): boolean {
  const keyMatches = event.key.toLowerCase() === binding.key.toLowerCase();

  const modifiersMatch =
    binding.modifiers.includes("ctrl") === (event.ctrlKey || event.metaKey) &&
    binding.modifiers.includes("alt") === event.altKey &&
    binding.modifiers.includes("shift") === event.shiftKey;

  return keyMatches && modifiersMatch;
}

/**
 * Manager class for keyboard shortcuts.
 *
 * Handles registration, conflict detection, and event dispatching
 * for keyboard shortcuts.
 *
 * @example
 * ```typescript
 * const manager = new ShortcutManager({ preventDefault: true });
 * manager.register('save', {
 *   key: 's',
 *   modifiers: ['ctrl'],
 *   description: 'Save document',
 *   category: 'file',
 *   handler: () => saveDocument()
 * });
 * manager.enable();
 * ```
 */
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutBinding> = new Map();
  private config: Required<ShortcutManagerConfig>;
  private enabled = false;
  private boundHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(config: ShortcutManagerConfig = {}) {
    this.config = {
      preventDefault: config.preventDefault ?? true,
      stopPropagation: config.stopPropagation ?? false,
      ignoreElements: config.ignoreElements ?? ["INPUT", "TEXTAREA", "SELECT"],
    };
  }

  /**
   * Register a keyboard shortcut.
   *
   * @param id - Unique identifier for the shortcut
   * @param binding - Shortcut binding configuration
   * @throws Error if shortcut ID already exists
   */
  register(id: string, binding: ShortcutBinding): void {
    if (this.shortcuts.has(id)) {
      throw new Error(`Shortcut with id "${id}" already registered`);
    }

    // Check for conflicts
    const conflict = this.findConflict(binding);
    if (conflict) {
      console.warn(
        `Shortcut conflict: "${id}" conflicts with "${conflict}"`
      );
    }

    this.shortcuts.set(id, { ...binding, enabled: binding.enabled ?? true });
  }

  /**
   * Register multiple shortcuts at once.
   *
   * @param shortcuts - Record of shortcut IDs to bindings
   */
  registerShortcuts(shortcuts: Record<string, ShortcutBinding>): void {
    for (const [id, binding] of Object.entries(shortcuts)) {
      this.register(id, binding);
    }
  }

  /**
   * Unregister a shortcut by ID.
   *
   * @param id - Shortcut ID to remove
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Enable a specific shortcut.
   *
   * @param id - Shortcut ID to enable
   */
  enableShortcut(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = true;
    }
  }

  /**
   * Disable a specific shortcut.
   *
   * @param id - Shortcut ID to disable
   */
  disableShortcut(id: string): void {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = false;
    }
  }

  /**
   * Find conflicting shortcut binding.
   *
   * @param binding - Binding to check for conflicts
   * @returns ID of conflicting shortcut, or null
   */
  private findConflict(binding: ShortcutBinding): string | null {
    for (const [id, existing] of this.shortcuts) {
      if (
        existing.key.toLowerCase() === binding.key.toLowerCase() &&
        existing.modifiers.length === binding.modifiers.length &&
        existing.modifiers.every((m) => binding.modifiers.includes(m))
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Handle keyboard events.
   */
  private handleKeydown = (event: KeyboardEvent): void => {
    // Ignore if in configured elements
    const target = event.target as HTMLElement;
    if (this.config.ignoreElements.includes(target.tagName)) {
      return;
    }

    for (const [_id, binding] of this.shortcuts) {
      if (!binding.enabled) continue;

      if (matchesShortcut(event, binding)) {
        if (this.config.preventDefault) {
          event.preventDefault();
        }
        if (this.config.stopPropagation) {
          event.stopPropagation();
        }
        binding.handler();
        return;
      }
    }
  };

  /**
   * Enable the shortcut manager.
   */
  enable(): void {
    if (this.enabled) return;

    this.boundHandler = this.handleKeydown;
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.boundHandler);
    }
    this.enabled = true;
  }

  /**
   * Disable the shortcut manager.
   */
  disable(): void {
    if (!this.enabled || !this.boundHandler) return;

    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.boundHandler);
    }
    this.boundHandler = null;
    this.enabled = false;
  }

  /**
   * Get all registered shortcuts.
   *
   * @returns Array of [id, binding] pairs
   */
  getAll(): Array<[string, ShortcutBinding]> {
    return Array.from(this.shortcuts.entries());
  }

  /**
   * Get shortcuts by category.
   *
   * @param category - Category to filter by
   * @returns Array of [id, binding] pairs in the category
   */
  getByCategory(category: ShortcutCategory): Array<[string, ShortcutBinding]> {
    return Array.from(this.shortcuts.entries()).filter(
      ([, binding]) => binding.category === category
    );
  }

  /**
   * Generate help text for all shortcuts.
   *
   * @returns Formatted help text
   */
  generateHelpText(): string {
    const categories = new Map<ShortcutCategory, string[]>();

    for (const [, binding] of this.shortcuts) {
      if (!binding.enabled) continue;

      const line = `${formatShortcut(binding)}: ${binding.description}`;
      const existing = categories.get(binding.category) || [];
      existing.push(line);
      categories.set(binding.category, existing);
    }

    const sections: string[] = [];
    const categoryOrder: ShortcutCategory[] = [
      "file",
      "editing",
      "ocr",
      "export",
      "view",
      "navigation",
    ];

    for (const category of categoryOrder) {
      const shortcuts = categories.get(category);
      if (shortcuts && shortcuts.length > 0) {
        const title = category.charAt(0).toUpperCase() + category.slice(1);
        sections.push(`## ${title}\n${shortcuts.join("\n")}`);
      }
    }

    return sections.join("\n\n");
  }
}

/**
 * Default shortcuts for type-it-up.
 * Handler functions are placeholders - replace with actual implementations.
 */
export const defaultShortcuts: Record<string, Omit<ShortcutBinding, "handler">> = {
  save: {
    key: "s",
    modifiers: ["ctrl"],
    description: "Save current document",
    category: "file",
  },
  exportPdf: {
    key: "e",
    modifiers: ["ctrl", "shift"],
    description: "Export as PDF",
    category: "export",
  },
  newDocument: {
    key: "n",
    modifiers: ["ctrl"],
    description: "Create new document",
    category: "file",
  },
  runOcr: {
    key: "o",
    modifiers: ["ctrl", "shift"],
    description: "Run OCR on current image",
    category: "ocr",
  },
  togglePreview: {
    key: "p",
    modifiers: ["ctrl"],
    description: "Toggle preview mode",
    category: "view",
  },
  undo: {
    key: "z",
    modifiers: ["ctrl"],
    description: "Undo last action",
    category: "editing",
  },
  redo: {
    key: "z",
    modifiers: ["ctrl", "shift"],
    description: "Redo last action",
    category: "editing",
  },
  zoomIn: {
    key: "=",
    modifiers: ["ctrl"],
    description: "Zoom in",
    category: "view",
  },
  zoomOut: {
    key: "-",
    modifiers: ["ctrl"],
    description: "Zoom out",
    category: "view",
  },
  resetZoom: {
    key: "0",
    modifiers: ["ctrl"],
    description: "Reset zoom to 100%",
    category: "view",
  },
};
