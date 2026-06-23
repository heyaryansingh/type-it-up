/**
 * LaTeX Symbol Palette - Quick insert for common mathematical symbols and operators
 *
 * Provides categorized symbol collections for quick insertion into documents
 */

export interface SymbolCategory {
  name: string;
  symbols: Symbol[];
}

export interface Symbol {
  latex: string;
  display: string;
  description: string;
  keywords: string[];
}

/**
 * Greek letters (lowercase and uppercase)
 */
export const greekLetters: SymbolCategory = {
  name: "Greek Letters",
  symbols: [
    { latex: "\\alpha", display: "α", description: "Alpha", keywords: ["alpha", "a"] },
    { latex: "\\beta", display: "β", description: "Beta", keywords: ["beta", "b"] },
    { latex: "\\gamma", display: "γ", description: "Gamma", keywords: ["gamma", "g"] },
    { latex: "\\delta", display: "δ", description: "Delta", keywords: ["delta", "d"] },
    { latex: "\\epsilon", display: "ε", description: "Epsilon", keywords: ["epsilon", "e"] },
    { latex: "\\zeta", display: "ζ", description: "Zeta", keywords: ["zeta", "z"] },
    { latex: "\\eta", display: "η", description: "Eta", keywords: ["eta"] },
    { latex: "\\theta", display: "θ", description: "Theta", keywords: ["theta", "t"] },
    { latex: "\\iota", display: "ι", description: "Iota", keywords: ["iota", "i"] },
    { latex: "\\kappa", display: "κ", description: "Kappa", keywords: ["kappa", "k"] },
    { latex: "\\lambda", display: "λ", description: "Lambda", keywords: ["lambda", "l"] },
    { latex: "\\mu", display: "μ", description: "Mu", keywords: ["mu", "m"] },
    { latex: "\\nu", display: "ν", description: "Nu", keywords: ["nu", "n"] },
    { latex: "\\xi", display: "ξ", description: "Xi", keywords: ["xi", "x"] },
    { latex: "\\pi", display: "π", description: "Pi", keywords: ["pi", "p"] },
    { latex: "\\rho", display: "ρ", description: "Rho", keywords: ["rho", "r"] },
    { latex: "\\sigma", display: "σ", description: "Sigma", keywords: ["sigma", "s"] },
    { latex: "\\tau", display: "τ", description: "Tau", keywords: ["tau", "t"] },
    { latex: "\\phi", display: "φ", description: "Phi", keywords: ["phi", "f"] },
    { latex: "\\chi", display: "χ", description: "Chi", keywords: ["chi", "c"] },
    { latex: "\\psi", display: "ψ", description: "Psi", keywords: ["psi", "p"] },
    { latex: "\\omega", display: "ω", description: "Omega", keywords: ["omega", "o"] },
    { latex: "\\Gamma", display: "Γ", description: "Gamma (uppercase)", keywords: ["Gamma", "G"] },
    { latex: "\\Delta", display: "Δ", description: "Delta (uppercase)", keywords: ["Delta", "D"] },
    { latex: "\\Theta", display: "Θ", description: "Theta (uppercase)", keywords: ["Theta", "T"] },
    { latex: "\\Lambda", display: "Λ", description: "Lambda (uppercase)", keywords: ["Lambda", "L"] },
    { latex: "\\Sigma", display: "Σ", description: "Sigma (uppercase)", keywords: ["Sigma", "S"] },
    { latex: "\\Phi", display: "Φ", description: "Phi (uppercase)", keywords: ["Phi", "F"] },
    { latex: "\\Psi", display: "Ψ", description: "Psi (uppercase)", keywords: ["Psi", "P"] },
    { latex: "\\Omega", display: "Ω", description: "Omega (uppercase)", keywords: ["Omega", "O"] },
  ],
};

/**
 * Binary operators
 */
export const binaryOperators: SymbolCategory = {
  name: "Binary Operators",
  symbols: [
    { latex: "+", display: "+", description: "Plus", keywords: ["plus", "add"] },
    { latex: "-", display: "-", description: "Minus", keywords: ["minus", "subtract"] },
    { latex: "\\times", display: "×", description: "Times", keywords: ["times", "multiply"] },
    { latex: "\\div", display: "÷", description: "Divide", keywords: ["divide", "division"] },
    { latex: "\\pm", display: "±", description: "Plus-minus", keywords: ["plusminus", "pm"] },
    { latex: "\\mp", display: "∓", description: "Minus-plus", keywords: ["minusplus", "mp"] },
    { latex: "\\cdot", display: "⋅", description: "Dot", keywords: ["dot", "cdot"] },
    { latex: "\\ast", display: "∗", description: "Asterisk", keywords: ["asterisk", "star"] },
    { latex: "\\circ", display: "∘", description: "Circle", keywords: ["circle", "compose"] },
    { latex: "\\oplus", display: "⊕", description: "Circled plus", keywords: ["oplus", "xor"] },
    { latex: "\\otimes", display: "⊗", description: "Circled times", keywords: ["otimes", "tensor"] },
  ],
};

/**
 * Relation symbols
 */
export const relationSymbols: SymbolCategory = {
  name: "Relations",
  symbols: [
    { latex: "=", display: "=", description: "Equals", keywords: ["equals", "eq"] },
    { latex: "\\neq", display: "≠", description: "Not equal", keywords: ["neq", "notequal"] },
    { latex: "<", display: "<", description: "Less than", keywords: ["less", "lt"] },
    { latex: ">", display: ">", description: "Greater than", keywords: ["greater", "gt"] },
    { latex: "\\leq", display: "≤", description: "Less or equal", keywords: ["leq", "le"] },
    { latex: "\\geq", display: "≥", description: "Greater or equal", keywords: ["geq", "ge"] },
    { latex: "\\ll", display: "≪", description: "Much less", keywords: ["ll", "muchless"] },
    { latex: "\\gg", display: "≫", description: "Much greater", keywords: ["gg", "muchgreater"] },
    { latex: "\\equiv", display: "≡", description: "Equivalent", keywords: ["equiv", "identical"] },
    { latex: "\\approx", display: "≈", description: "Approximately", keywords: ["approx", "about"] },
    { latex: "\\sim", display: "∼", description: "Similar", keywords: ["sim", "similar"] },
    { latex: "\\propto", display: "∝", description: "Proportional", keywords: ["propto", "proportional"] },
  ],
};

/**
 * Calculus and analysis symbols
 */
export const calculusSymbols: SymbolCategory = {
  name: "Calculus",
  symbols: [
    { latex: "\\int", display: "∫", description: "Integral", keywords: ["int", "integral"] },
    { latex: "\\oint", display: "∮", description: "Contour integral", keywords: ["oint", "contour"] },
    { latex: "\\partial", display: "∂", description: "Partial derivative", keywords: ["partial", "d"] },
    { latex: "\\nabla", display: "∇", description: "Nabla/gradient", keywords: ["nabla", "grad", "gradient"] },
    { latex: "\\sum", display: "∑", description: "Sum", keywords: ["sum", "sigma"] },
    { latex: "\\prod", display: "∏", description: "Product", keywords: ["prod", "product", "pi"] },
    { latex: "\\lim", display: "lim", description: "Limit", keywords: ["lim", "limit"] },
    { latex: "\\infty", display: "∞", description: "Infinity", keywords: ["infty", "infinity"] },
  ],
};

/**
 * Set theory symbols
 */
export const setTheorySymbols: SymbolCategory = {
  name: "Set Theory",
  symbols: [
    { latex: "\\in", display: "∈", description: "Element of", keywords: ["in", "element"] },
    { latex: "\\notin", display: "∉", description: "Not element of", keywords: ["notin", "notelement"] },
    { latex: "\\subset", display: "⊂", description: "Subset", keywords: ["subset"] },
    { latex: "\\supset", display: "⊃", description: "Superset", keywords: ["supset", "superset"] },
    { latex: "\\subseteq", display: "⊆", description: "Subset or equal", keywords: ["subseteq"] },
    { latex: "\\supseteq", display: "⊇", description: "Superset or equal", keywords: ["supseteq"] },
    { latex: "\\cup", display: "∪", description: "Union", keywords: ["cup", "union"] },
    { latex: "\\cap", display: "∩", description: "Intersection", keywords: ["cap", "intersection"] },
    { latex: "\\emptyset", display: "∅", description: "Empty set", keywords: ["emptyset", "empty"] },
    { latex: "\\forall", display: "∀", description: "For all", keywords: ["forall", "universal"] },
    { latex: "\\exists", display: "∃", description: "Exists", keywords: ["exists", "existential"] },
  ],
};

/**
 * Logic symbols
 */
export const logicSymbols: SymbolCategory = {
  name: "Logic",
  symbols: [
    { latex: "\\land", display: "∧", description: "Logical and", keywords: ["land", "and", "wedge"] },
    { latex: "\\lor", display: "∨", description: "Logical or", keywords: ["lor", "or", "vee"] },
    { latex: "\\neg", display: "¬", description: "Negation", keywords: ["neg", "not"] },
    { latex: "\\implies", display: "⇒", description: "Implies", keywords: ["implies", "rightarrow"] },
    { latex: "\\iff", display: "⇔", description: "If and only if", keywords: ["iff", "leftrightarrow"] },
  ],
};

/**
 * Arrows
 */
export const arrows: SymbolCategory = {
  name: "Arrows",
  symbols: [
    { latex: "\\to", display: "→", description: "Right arrow", keywords: ["to", "right", "arrow"] },
    { latex: "\\leftarrow", display: "←", description: "Left arrow", keywords: ["leftarrow", "left"] },
    { latex: "\\leftrightarrow", display: "↔", description: "Left-right arrow", keywords: ["leftrightarrow", "lr"] },
    { latex: "\\uparrow", display: "↑", description: "Up arrow", keywords: ["uparrow", "up"] },
    { latex: "\\downarrow", display: "↓", description: "Down arrow", keywords: ["downarrow", "down"] },
    { latex: "\\Rightarrow", display: "⇒", description: "Double right arrow", keywords: ["Rightarrow", "implies"] },
    { latex: "\\Leftarrow", display: "⇐", description: "Double left arrow", keywords: ["Leftarrow"] },
    { latex: "\\Leftrightarrow", display: "⇔", description: "Double left-right arrow", keywords: ["Leftrightarrow", "iff"] },
  ],
};

/**
 * All symbol categories
 */
export const allCategories: SymbolCategory[] = [
  greekLetters,
  binaryOperators,
  relationSymbols,
  calculusSymbols,
  setTheorySymbols,
  logicSymbols,
  arrows,
];

/**
 * Search symbols by keyword
 */
export function searchSymbols(query: string): Symbol[] {
  const lowerQuery = query.toLowerCase();
  const results: Symbol[] = [];

  for (const category of allCategories) {
    for (const symbol of category.symbols) {
      if (
        symbol.latex.toLowerCase().includes(lowerQuery) ||
        symbol.description.toLowerCase().includes(lowerQuery) ||
        symbol.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
      ) {
        results.push(symbol);
      }
    }
  }

  return results;
}

/**
 * Get frequently used symbols
 */
export function getFrequentSymbols(): Symbol[] {
  return [
    { latex: "\\alpha", display: "α", description: "Alpha", keywords: ["alpha"] },
    { latex: "\\beta", display: "β", description: "Beta", keywords: ["beta"] },
    { latex: "\\sum", display: "∑", description: "Sum", keywords: ["sum"] },
    { latex: "\\int", display: "∫", description: "Integral", keywords: ["integral"] },
    { latex: "\\partial", display: "∂", description: "Partial", keywords: ["partial"] },
    { latex: "\\infty", display: "∞", description: "Infinity", keywords: ["infinity"] },
    { latex: "\\leq", display: "≤", description: "Less or equal", keywords: ["leq"] },
    { latex: "\\geq", display: "≥", description: "Greater or equal", keywords: ["geq"] },
    { latex: "\\neq", display: "≠", description: "Not equal", keywords: ["neq"] },
    { latex: "\\approx", display: "≈", description: "Approximately", keywords: ["approx"] },
  ];
}

/**
 * Get symbol by LaTeX command
 */
export function getSymbolByLatex(latex: string): Symbol | undefined {
  for (const category of allCategories) {
    const symbol = category.symbols.find((s) => s.latex === latex);
    if (symbol) return symbol;
  }
  return undefined;
}
