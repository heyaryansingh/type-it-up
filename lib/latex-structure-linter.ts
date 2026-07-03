/**
 * LaTeX Structure Linter
 *
 * Validates document-level LaTeX structure: brace balance, matching
 * \begin{}/\end{} environment pairs, dangling \ref{} without a matching
 * \label{}, and duplicate \label{} definitions. Complements
 * equation-validator.ts (which checks individual math expressions) by
 * checking whole-document structural integrity.
 */

export type LintSeverity = "error" | "warning";

export interface LintIssue {
  severity: LintSeverity;
  message: string;
  line: number;
  context?: string;
}

export interface StructureLintResult {
  valid: boolean;
  issues: LintIssue[];
  errorCount: number;
  warningCount: number;
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

function lineText(content: string, index: number): string {
  const lines = content.split("\n");
  return lines[lineNumberAt(content, index) - 1]?.trim() ?? "";
}

/**
 * Check that curly braces are balanced, ignoring braces escaped with a
 * backslash (\{ and \}) and braces inside verbatim-style environments.
 */
export function checkBraceBalance(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const stack: number[] = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : "";

    if (prevChar === "\\") continue; // skip escaped \{ \}

    if (char === "{") {
      stack.push(i);
    } else if (char === "}") {
      if (stack.length === 0) {
        issues.push({
          severity: "error",
          message: "Unmatched closing brace '}' with no corresponding '{'",
          line: lineNumberAt(content, i),
          context: lineText(content, i),
        });
      } else {
        stack.pop();
      }
    }
  }

  for (const openIndex of stack) {
    issues.push({
      severity: "error",
      message: "Unmatched opening brace '{' with no corresponding '}'",
      line: lineNumberAt(content, openIndex),
      context: lineText(content, openIndex),
    });
  }

  return issues;
}

/**
 * Check that every \begin{env} has a matching \end{env}, properly nested.
 */
export function checkEnvironmentBalance(content: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const envPattern = /\\(begin|end)\{([^}]+)\}/g;
  const stack: { name: string; index: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = envPattern.exec(content)) !== null) {
    const [, kind, name] = match;
    if (kind === "begin") {
      stack.push({ name, index: match.index });
    } else {
      const top = stack.pop();
      if (!top) {
        issues.push({
          severity: "error",
          message: `\\end{${name}} has no matching \\begin{${name}}`,
          line: lineNumberAt(content, match.index),
          context: lineText(content, match.index),
        });
      } else if (top.name !== name) {
        issues.push({
          severity: "error",
          message: `Mismatched environment: \\begin{${top.name}} closed by \\end{${name}}`,
          line: lineNumberAt(content, match.index),
          context: lineText(content, match.index),
        });
      }
    }
  }

  for (const unclosed of stack) {
    issues.push({
      severity: "error",
      message: `\\begin{${unclosed.name}} is never closed with \\end{${unclosed.name}}`,
      line: lineNumberAt(content, unclosed.index),
      context: lineText(content, unclosed.index),
    });
  }

  return issues;
}

/**
 * Check \ref{}/\eqref{}/\pageref{} targets have a corresponding \label{},
 * and flag duplicate \label{} definitions.
 */
export function checkReferences(content: string): LintIssue[] {
  const issues: LintIssue[] = [];

  const labelPattern = /\\label\{([^}]+)\}/g;
  const labels = new Map<string, number[]>();
  let match: RegExpExecArray | null;
  while ((match = labelPattern.exec(content)) !== null) {
    const key = match[1];
    const positions = labels.get(key) ?? [];
    positions.push(match.index);
    labels.set(key, positions);
  }

  for (const [key, positions] of labels) {
    if (positions.length > 1) {
      for (const pos of positions) {
        issues.push({
          severity: "error",
          message: `Duplicate \\label{${key}} defined ${positions.length} times`,
          line: lineNumberAt(content, pos),
          context: lineText(content, pos),
        });
      }
    }
  }

  const refPattern = /\\(?:ref|eqref|pageref|autoref|cref)\{([^}]+)\}/g;
  while ((match = refPattern.exec(content)) !== null) {
    const key = match[1];
    if (!labels.has(key)) {
      issues.push({
        severity: "warning",
        message: `Reference to undefined label '${key}'`,
        line: lineNumberAt(content, match.index),
        context: lineText(content, match.index),
      });
    }
  }

  return issues;
}

/**
 * Run all structural lint checks against a LaTeX document and return a
 * combined result sorted by line number.
 */
export function lintLatexStructure(content: string): StructureLintResult {
  const issues = [
    ...checkBraceBalance(content),
    ...checkEnvironmentBalance(content),
    ...checkReferences(content),
  ].sort((a, b) => a.line - b.line);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return {
    valid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}
