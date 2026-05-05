/**
 * Equation validation and error correction utilities for LaTeX mathematical expressions.
 *
 * Provides comprehensive validation for LaTeX equations including:
 * - Bracket/parenthesis matching
 * - Command syntax validation
 * - Common error detection and auto-correction
 * - Equation formatting suggestions
 *
 * @module equation-validator
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  correctedLatex?: string;
}

export interface ValidationError {
  type: 'bracket_mismatch' | 'invalid_command' | 'syntax_error' | 'missing_argument';
  message: string;
  position?: number;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'deprecated_command' | 'formatting' | 'ambiguous' | 'inefficient';
  message: string;
  position?: number;
  suggestion?: string;
}

/**
 * Validate a LaTeX mathematical expression and return detailed results.
 *
 * @param latex - The LaTeX equation string to validate
 * @param autoCorrect - Whether to attempt automatic correction of common errors
 * @returns Validation result with errors, warnings, and optional corrected version
 *
 * @example
 * ```ts
 * const result = validateEquation('\\frac{x^2 + 1}{x - 1');
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors);
 *   console.log('Corrected:', result.correctedLatex);
 * }
 * ```
 */
export function validateEquation(latex: string, autoCorrect = true): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let corrected = latex;

  // Check bracket matching
  const bracketErrors = checkBracketMatching(latex);
  errors.push(...bracketErrors);

  // Check for invalid commands
  const commandErrors = checkCommands(latex);
  errors.push(...commandErrors);

  // Check for common syntax errors
  const syntaxErrors = checkSyntax(latex);
  errors.push(...syntaxErrors);

  // Generate warnings for deprecated or inefficient patterns
  const formatWarnings = checkFormatting(latex);
  warnings.push(...formatWarnings);

  // Attempt auto-correction if requested and errors found
  if (autoCorrect && errors.length > 0) {
    corrected = attemptCorrection(latex, errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    correctedLatex: autoCorrect && errors.length > 0 ? corrected : undefined,
  };
}

/**
 * Check for matching brackets, braces, and parentheses in LaTeX.
 */
function checkBracketMatching(latex: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const stack: Array<{ char: string; pos: number }> = [];
  const pairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
  };

  for (let i = 0; i < latex.length; i++) {
    const char = latex[i];

    // Skip escaped characters
    if (i > 0 && latex[i - 1] === '\\') continue;

    if (['(', '[', '{'].includes(char)) {
      stack.push({ char, pos: i });
    } else if ([')', ']', '}'].includes(char)) {
      if (stack.length === 0) {
        errors.push({
          type: 'bracket_mismatch',
          message: `Unmatched closing '${char}'`,
          position: i,
          suggestion: `Remove '${char}' or add opening bracket`,
        });
      } else {
        const last = stack.pop()!;
        if (pairs[last.char] !== char) {
          errors.push({
            type: 'bracket_mismatch',
            message: `Mismatched brackets: '${last.char}' and '${char}'`,
            position: i,
            suggestion: `Change '${char}' to '${pairs[last.char]}'`,
          });
        }
      }
    }
  }

  // Check for unclosed brackets
  for (const { char, pos } of stack) {
    errors.push({
      type: 'bracket_mismatch',
      message: `Unclosed '${char}'`,
      position: pos,
      suggestion: `Add closing '${pairs[char]}'`,
    });
  }

  return errors;
}

/**
 * Check for invalid LaTeX commands and missing arguments.
 */
function checkCommands(latex: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Common commands that require arguments
  const commandsWithArgs = [
    'frac',
    'sqrt',
    'text',
    'mathbb',
    'mathcal',
    'mathrm',
    'overline',
    'underline',
    'sum',
    'prod',
    'int',
  ];

  const commandPattern = /\\([a-zA-Z]+)/g;
  let match;

  while ((match = commandPattern.exec(latex)) !== null) {
    const command = match[1];
    const pos = match.index;

    // Check if command requires arguments but none provided
    if (commandsWithArgs.includes(command)) {
      const afterCommand = latex.substring(pos + match[0].length).trimStart();
      if (!afterCommand.startsWith('{')) {
        errors.push({
          type: 'missing_argument',
          message: `Command '\\${command}' requires arguments`,
          position: pos,
          suggestion: `Add braces: \\${command}{...}`,
        });
      }
    }

    // Warn about unknown commands (basic heuristic)
    if (command.length > 15) {
      errors.push({
        type: 'invalid_command',
        message: `Possibly invalid command '\\${command}'`,
        position: pos,
        suggestion: 'Verify command name',
      });
    }
  }

  return errors;
}

/**
 * Check for common syntax errors in LaTeX equations.
 */
function checkSyntax(latex: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for empty superscripts/subscripts
  const emptyScriptPattern = /[_^]\{\}/g;
  let match;

  while ((match = emptyScriptPattern.exec(latex)) !== null) {
    errors.push({
      type: 'syntax_error',
      message: `Empty ${match[0][0] === '_' ? 'subscript' : 'superscript'}`,
      position: match.index,
      suggestion: 'Remove or fill the empty brackets',
    });
  }

  // Check for double superscripts/subscripts without braces
  const doubleScriptPattern = /[_^][^{][_^]/g;
  while ((match = doubleScriptPattern.exec(latex)) !== null) {
    errors.push({
      type: 'syntax_error',
      message: 'Ambiguous superscript/subscript without braces',
      position: match.index,
      suggestion: 'Use braces to clarify: x^{2}_{1} instead of x^2_1',
    });
  }

  return errors;
}

/**
 * Generate formatting warnings for deprecated or inefficient patterns.
 */
function checkFormatting(latex: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Warn about deprecated \over command
  if (latex.includes('\\over')) {
    warnings.push({
      type: 'deprecated_command',
      message: 'Command \\over is deprecated',
      suggestion: 'Use \\frac{numerator}{denominator} instead',
    });
  }

  // Warn about excessive nesting
  const nestingDepth = calculateNestingDepth(latex);
  if (nestingDepth > 5) {
    warnings.push({
      type: 'inefficient',
      message: `Deep nesting detected (depth: ${nestingDepth})`,
      suggestion: 'Consider simplifying equation structure',
    });
  }

  // Suggest spacing improvements
  if (latex.includes('  ')) {
    warnings.push({
      type: 'formatting',
      message: 'Multiple consecutive spaces detected',
      suggestion: 'Use single spaces or LaTeX spacing commands (\\, \\: \\;)',
    });
  }

  return warnings;
}

/**
 * Calculate maximum nesting depth of braces in LaTeX.
 */
function calculateNestingDepth(latex: string): number {
  let depth = 0;
  let maxDepth = 0;

  for (let i = 0; i < latex.length; i++) {
    const char = latex[i];

    // Skip escaped characters
    if (i > 0 && latex[i - 1] === '\\') continue;

    if (char === '{') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === '}') {
      depth--;
    }
  }

  return maxDepth;
}

/**
 * Attempt to automatically correct common LaTeX errors.
 */
function attemptCorrection(latex: string, errors: ValidationError[]): string {
  let corrected = latex;

  // Sort errors by position (descending) to avoid offset issues
  const sortedErrors = [...errors].sort((a, b) => (b.position ?? 0) - (a.position ?? 0));

  for (const error of sortedErrors) {
    if (error.type === 'bracket_mismatch' && error.position !== undefined) {
      // Attempt to add missing closing bracket
      if (error.message.startsWith('Unclosed')) {
        const bracketChar = error.message.match(/'(.)'/)![1];
        const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
        corrected = corrected + pairs[bracketChar];
      }
    } else if (error.type === 'syntax_error' && error.position !== undefined) {
      // Remove empty subscripts/superscripts
      if (error.message.includes('Empty')) {
        corrected =
          corrected.slice(0, error.position) + corrected.slice(error.position + 3);
      }
    }
  }

  return corrected;
}

/**
 * Extract and validate all mathematical expressions from a markdown document.
 *
 * @param markdown - Markdown content with inline ($...$) and block ($$...$$) math
 * @returns Array of validation results for each math expression found
 *
 * @example
 * ```ts
 * const content = 'Some text $\\frac{1}{x}$ and $$\\int_0^\\infty e^{-x} dx$$';
 * const results = validateMarkdownMath(content);
 * for (const result of results) {
 *   if (!result.isValid) {
 *     console.log('Invalid equation:', result.errors);
 *   }
 * }
 * ```
 */
export function validateMarkdownMath(markdown: string): Array<ValidationResult & { equation: string }> {
  const results: Array<ValidationResult & { equation: string }> = [];

  // Match inline math $...$
  const inlinePattern = /\$([^$]+)\$/g;
  let match;

  while ((match = inlinePattern.exec(markdown)) !== null) {
    const equation = match[1];
    results.push({
      equation,
      ...validateEquation(equation),
    });
  }

  // Match block math $$...$$
  const blockPattern = /\$\$([\s\S]+?)\$\$/g;
  while ((match = blockPattern.exec(markdown)) !== null) {
    const equation = match[1];
    results.push({
      equation,
      ...validateEquation(equation),
    });
  }

  return results;
}

/**
 * Format LaTeX equation for better readability and consistency.
 *
 * @param latex - LaTeX equation to format
 * @returns Formatted LaTeX with consistent spacing and structure
 *
 * @example
 * ```ts
 * const formatted = formatEquation('x^2+y^2=z^2');
 * // Returns: 'x^{2} + y^{2} = z^{2}'
 * ```
 */
export function formatEquation(latex: string): string {
  let formatted = latex;

  // Add spaces around binary operators
  formatted = formatted.replace(/([+\-=<>])/g, ' $1 ');

  // Add braces to single-character superscripts/subscripts if missing
  formatted = formatted.replace(/([_^])([a-zA-Z0-9](?![{]))/g, '$1{$2}');

  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();

  return formatted;
}
