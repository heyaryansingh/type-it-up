/**
 * LaTeX Package Dependency Resolver
 *
 * Analyzes LaTeX documents to identify required packages, detect missing dependencies,
 * and provide installation recommendations for local TeX distributions.
 */

export interface PackageInfo {
  name: string;
  required: boolean;
  description: string;
  alternatives?: string[];
  ctan_url?: string;
}

export interface DependencyAnalysis {
  packages: PackageInfo[];
  missing: string[];
  conflicts: ConflictInfo[];
  recommendations: string[];
}

export interface ConflictInfo {
  package1: string;
  package2: string;
  reason: string;
  resolution: string;
}

/**
 * Common LaTeX packages with metadata
 */
const PACKAGE_DATABASE: Record<string, PackageInfo> = {
  // Math packages
  amsmath: {
    name: "amsmath",
    required: true,
    description: "AMS mathematical typesetting",
    ctan_url: "https://ctan.org/pkg/amsmath",
  },
  amssymb: {
    name: "amssymb",
    required: true,
    description: "AMS mathematical symbols",
    ctan_url: "https://ctan.org/pkg/amsfonts",
  },
  mathtools: {
    name: "mathtools",
    required: false,
    description: "Enhanced math typesetting",
    ctan_url: "https://ctan.org/pkg/mathtools",
  },
  amsthm: {
    name: "amsthm",
    required: false,
    description: "Theorem environments",
    ctan_url: "https://ctan.org/pkg/amsthm",
  },

  // Graphics
  graphicx: {
    name: "graphicx",
    required: true,
    description: "Enhanced graphics support",
    ctan_url: "https://ctan.org/pkg/graphicx",
  },
  tikz: {
    name: "tikz",
    required: false,
    description: "Programmatic graphics",
    alternatives: ["pgf"],
    ctan_url: "https://ctan.org/pkg/pgf",
  },

  // Layout
  geometry: {
    name: "geometry",
    required: false,
    description: "Page layout customization",
    ctan_url: "https://ctan.org/pkg/geometry",
  },
  fancyhdr: {
    name: "fancyhdr",
    required: false,
    description: "Customizable headers and footers",
    ctan_url: "https://ctan.org/pkg/fancyhdr",
  },

  // Bibliography
  biblatex: {
    name: "biblatex",
    required: false,
    description: "Sophisticated bibliography management",
    alternatives: ["natbib"],
    ctan_url: "https://ctan.org/pkg/biblatex",
  },
  natbib: {
    name: "natbib",
    required: false,
    description: "Natural sciences bibliography",
    alternatives: ["biblatex"],
    ctan_url: "https://ctan.org/pkg/natbib",
  },

  // Formatting
  hyperref: {
    name: "hyperref",
    required: false,
    description: "Hyperlinks and PDF bookmarks",
    ctan_url: "https://ctan.org/pkg/hyperref",
  },
  xcolor: {
    name: "xcolor",
    required: false,
    description: "Extended color support",
    ctan_url: "https://ctan.org/pkg/xcolor",
  },

  // Algorithms
  algorithm: {
    name: "algorithm",
    required: false,
    description: "Algorithm float environment",
    ctan_url: "https://ctan.org/pkg/algorithms",
  },
  algorithmic: {
    name: "algorithmic",
    required: false,
    description: "Algorithm typesetting",
    alternatives: ["algorithmicx"],
    ctan_url: "https://ctan.org/pkg/algorithms",
  },

  // Tables
  booktabs: {
    name: "booktabs",
    required: false,
    description: "Professional table formatting",
    ctan_url: "https://ctan.org/pkg/booktabs",
  },
  multirow: {
    name: "multirow",
    required: false,
    description: "Multi-row table cells",
    ctan_url: "https://ctan.org/pkg/multirow",
  },

  // Code
  listings: {
    name: "listings",
    required: false,
    description: "Source code formatting",
    alternatives: ["minted"],
    ctan_url: "https://ctan.org/pkg/listings",
  },
  minted: {
    name: "minted",
    required: false,
    description: "Syntax-highlighted code (requires Pygments)",
    alternatives: ["listings"],
    ctan_url: "https://ctan.org/pkg/minted",
  },
};

/**
 * Known package conflicts
 */
const PACKAGE_CONFLICTS: ConflictInfo[] = [
  {
    package1: "natbib",
    package2: "biblatex",
    reason: "Both provide bibliography management with incompatible interfaces",
    resolution: "Choose one: natbib for traditional BibTeX, biblatex for modern features",
  },
  {
    package1: "subfigure",
    package2: "subfig",
    reason: "Both provide subfigure functionality with conflicting commands",
    resolution: "Use subfig (more modern) or subcaption (recommended)",
  },
  {
    package1: "algorithm",
    package2: "algorithm2e",
    reason: "Both define the algorithm environment",
    resolution: "Choose one: algorithm + algorithmic is traditional, algorithm2e is all-in-one",
  },
];

/**
 * Analyze LaTeX document for package dependencies
 */
export function analyzeDependencies(latexContent: string): DependencyAnalysis {
  const packages = extractPackages(latexContent);
  const packagesInfo = packages.map(
    (pkg) => PACKAGE_DATABASE[pkg] || createUnknownPackage(pkg)
  );

  const missing = detectMissingPackages(latexContent, packages);
  const conflicts = detectConflicts(packages);
  const recommendations = generateRecommendations(latexContent, packages);

  return {
    packages: packagesInfo,
    missing,
    conflicts,
    recommendations,
  };
}

/**
 * Extract package names from \usepackage commands
 */
function extractPackages(latexContent: string): string[] {
  const packageRegex = /\\usepackage(?:\[.*?\])?\{([^}]+)\}/g;
  const packages: string[] = [];

  let match;
  while ((match = packageRegex.exec(latexContent)) !== null) {
    // Handle multiple packages in one command: \usepackage{pkg1,pkg2}
    const pkgList = match[1].split(",").map((p) => p.trim());
    packages.push(...pkgList);
  }

  return [...new Set(packages)]; // Remove duplicates
}

/**
 * Create package info for unknown packages
 */
function createUnknownPackage(name: string): PackageInfo {
  return {
    name,
    required: false,
    description: "Unknown package (not in database)",
    ctan_url: `https://ctan.org/search?phrase=${encodeURIComponent(name)}`,
  };
}

/**
 * Detect packages that are used but not imported
 */
function detectMissingPackages(
  latexContent: string,
  declaredPackages: string[]
): string[] {
  const missing: string[] = [];

  // Check for common commands that require packages
  const commandPackageMap: Record<string, string> = {
    "\\includegraphics": "graphicx",
    "\\tikz": "tikz",
    "\\begin{algorithm}": "algorithm",
    "\\begin{algorithmic}": "algorithmic",
    "\\cite": "natbib or biblatex",
    "\\href": "hyperref",
    "\\textcolor": "xcolor or color",
    "\\begin{lstlisting}": "listings",
    "\\begin{minted}": "minted",
  };

  for (const [command, pkg] of Object.entries(commandPackageMap)) {
    if (latexContent.includes(command)) {
      // Check if any of the required packages are declared
      const pkgs = pkg.includes("or") ? pkg.split(" or ") : [pkg];
      const hasPackage = pkgs.some((p) => declaredPackages.includes(p));

      if (!hasPackage) {
        missing.push(pkg);
      }
    }
  }

  return [...new Set(missing)];
}

/**
 * Detect conflicting packages
 */
function detectConflicts(packages: string[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  for (const conflict of PACKAGE_CONFLICTS) {
    if (
      packages.includes(conflict.package1) &&
      packages.includes(conflict.package2)
    ) {
      conflicts.push(conflict);
    }
  }

  return conflicts;
}

/**
 * Generate recommendations based on document content
 */
function generateRecommendations(
  latexContent: string,
  packages: string[]
): string[] {
  const recommendations: string[] = [];

  // Math-heavy document
  if (
    (latexContent.match(/\$.*?\$/g) || []).length > 10 &&
    !packages.includes("amsmath")
  ) {
    recommendations.push(
      "Document contains many math expressions. Consider adding \\usepackage{amsmath} for enhanced math typesetting."
    );
  }

  // Links in document
  if (
    /https?:\/\/|\\url\{/.test(latexContent) &&
    !packages.includes("hyperref")
  ) {
    recommendations.push(
      "Document contains URLs. Add \\usepackage{hyperref} to make them clickable in PDFs."
    );
  }

  // Tables without booktabs
  if (
    /\\begin\{tabular\}/.test(latexContent) &&
    !packages.includes("booktabs")
  ) {
    recommendations.push(
      "Document has tables. Consider \\usepackage{booktabs} for professional-looking tables."
    );
  }

  // Code blocks without syntax highlighting
  if (
    /\\begin\{verbatim\}/.test(latexContent) &&
    !packages.includes("listings") &&
    !packages.includes("minted")
  ) {
    recommendations.push(
      "Using verbatim for code. Consider \\usepackage{listings} or \\usepackage{minted} for syntax highlighting."
    );
  }

  // Subfigures needed
  if (/\\subfigure|\\subfig/.test(latexContent)) {
    if (!packages.includes("subfig") && !packages.includes("subcaption")) {
      recommendations.push(
        "Subfigures detected. Add \\usepackage{subcaption} (recommended) or \\usepackage{subfig}."
      );
    }
  }

  return recommendations;
}

/**
 * Generate installation instructions for missing packages
 */
export function generateInstallInstructions(
  missing: string[],
  distribution: "texlive" | "miktex" = "texlive"
): string {
  if (missing.length === 0) {
    return "All required packages are declared.";
  }

  let instructions = "Missing packages detected:\n\n";

  for (const pkg of missing) {
    instructions += `- ${pkg}\n`;
  }

  instructions += "\n### Installation Instructions:\n\n";

  if (distribution === "texlive") {
    instructions += "**TeX Live:**\n";
    instructions += "```bash\n";
    instructions += `tlmgr install ${missing.join(" ")}\n`;
    instructions += "```\n\n";
    instructions +=
      "If tlmgr is not in PATH, use full path (e.g., /usr/local/texlive/2023/bin/x86_64-linux/tlmgr)\n";
  } else {
    instructions += "**MiKTeX:**\n";
    instructions += "```bash\n";
    instructions += `mpm --install ${missing.join(" ")}\n`;
    instructions += "```\n\n";
    instructions +=
      "Or use MiKTeX Console GUI: Settings > Packages, then search and install.\n";
  }

  return instructions;
}

/**
 * Generate complete package dependency report
 */
export function generateDependencyReport(latexContent: string): string {
  const analysis = analyzeDependencies(latexContent);

  let report = "# LaTeX Package Dependency Report\n\n";

  // Declared packages
  report += "## Declared Packages\n\n";
  for (const pkg of analysis.packages) {
    report += `- **${pkg.name}**: ${pkg.description}\n`;
    if (pkg.alternatives) {
      report += `  - Alternatives: ${pkg.alternatives.join(", ")}\n`;
    }
  }
  report += "\n";

  // Missing packages
  if (analysis.missing.length > 0) {
    report += "## Missing Packages\n\n";
    report += generateInstallInstructions(analysis.missing);
    report += "\n";
  }

  // Conflicts
  if (analysis.conflicts.length > 0) {
    report += "## Package Conflicts\n\n";
    for (const conflict of analysis.conflicts) {
      report += `### ${conflict.package1} ↔ ${conflict.package2}\n\n`;
      report += `**Reason:** ${conflict.reason}\n\n`;
      report += `**Resolution:** ${conflict.resolution}\n\n`;
    }
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    report += "## Recommendations\n\n";
    for (const rec of analysis.recommendations) {
      report += `- ${rec}\n`;
    }
    report += "\n";
  }

  return report;
}

/**
 * Validate package compatibility with document class
 */
export function validatePackageCompatibility(
  latexContent: string
): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Extract document class
  const classMatch = /\\documentclass(?:\[.*?\])?\{([^}]+)\}/.exec(latexContent);
  const docClass = classMatch ? classMatch[1] : null;

  if (!docClass) {
    warnings.push("No document class found. Ensure \\documentclass is present.");
    return { compatible: false, warnings };
  }

  const packages = extractPackages(latexContent);

  // Check for beamer-specific issues
  if (docClass === "beamer") {
    if (packages.includes("geometry")) {
      warnings.push(
        "geometry package may conflict with beamer. Beamer has its own layout system."
      );
    }
  }

  // Check for article/report/book compatibility
  if (["article", "report", "book"].includes(docClass)) {
    if (packages.includes("beamerposter")) {
      warnings.push(
        `beamerposter package is for beamer class, not ${docClass}.`
      );
    }
  }

  return {
    compatible: warnings.length === 0,
    warnings,
  };
}
