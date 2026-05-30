/**
 * @fileoverview Export Optimization Utilities
 * @module lib/export-optimizer
 *
 * Optimizes document exports for PDF and LaTeX/Overleaf packages
 * by compressing assets, cleaning markup, and organizing files efficiently.
 *
 * @example
 * ```typescript
 * import { optimizeLatexExport, compressImages } from './export-optimizer';
 *
 * const optimized = await optimizeLatexExport(document);
 * const compressed = await compressImages(images, { quality: 0.8 });
 * ```
 */

export interface ExportOptimizationOptions {
  compressImages?: boolean;
  imageQuality?: number; // 0-1
  removeComments?: boolean;
  minifyWhitespace?: boolean;
  includeSources?: boolean;
}

export interface OptimizedExport {
  content: string;
  assets: Map<string, Blob>;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

export interface ImageCompressionOptions {
  quality?: number; // 0-1
  maxWidth?: number;
  maxHeight?: number;
  format?: "jpeg" | "png" | "webp";
}

const DEFAULT_EXPORT_OPTIONS: Required<ExportOptimizationOptions> = {
  compressImages: true,
  imageQuality: 0.85,
  removeComments: true,
  minifyWhitespace: false,
  includeSources: false,
};

const DEFAULT_IMAGE_OPTIONS: Required<ImageCompressionOptions> = {
  quality: 0.85,
  maxWidth: 2048,
  maxHeight: 2048,
  format: "jpeg",
};

/**
 * Optimize LaTeX content for export
 */
export function optimizeLatexContent(
  content: string,
  options: ExportOptimizationOptions = {}
): string {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  let optimized = content;

  // Remove LaTeX comments if requested
  if (opts.removeComments) {
    optimized = optimized.replace(/(?<!\\)%.*/g, "");
  }

  // Minify whitespace if requested (be careful with LaTeX formatting)
  if (opts.minifyWhitespace) {
    // Only remove multiple consecutive blank lines
    optimized = optimized.replace(/\n\n\n+/g, "\n\n");
    // Remove trailing whitespace
    optimized = optimized.replace(/[ \t]+$/gm, "");
  }

  // Normalize line endings
  optimized = optimized.replace(/\r\n/g, "\n");

  // Remove redundant packages
  optimized = removeRedundantPackages(optimized);

  return optimized;
}

/**
 * Remove redundant LaTeX package imports
 */
function removeRedundantPackages(content: string): string {
  const packageRegex = /\\usepackage(?:\[.*?\])?\{(.*?)\}/g;
  const packages = new Set<string>();
  const seen = new Set<string>();

  return content.replace(packageRegex, (match, packageName) => {
    if (seen.has(packageName)) {
      // Remove duplicate
      return "";
    }
    seen.add(packageName);
    return match;
  });
}

/**
 * Compress image for export
 */
export async function compressImage(
  imageData: string | Blob,
  options: ImageCompressionOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_IMAGE_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();

    const handleLoad = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // Resize if exceeds maximum dimensions
      if (width > opts.maxWidth || height > opts.maxHeight) {
        const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        `image/${opts.format}`,
        opts.quality
      );
    };

    img.onload = handleLoad;
    img.onerror = () => reject(new Error("Failed to load image"));

    if (typeof imageData === "string") {
      img.src = imageData;
    } else {
      img.src = URL.createObjectURL(imageData);
    }
  });
}

/**
 * Compress multiple images in batch
 */
export async function compressImages(
  images: Array<{ name: string; data: string | Blob }>,
  options: ImageCompressionOptions = {}
): Promise<Map<string, Blob>> {
  const compressed = new Map<string, Blob>();

  await Promise.all(
    images.map(async ({ name, data }) => {
      try {
        const blob = await compressImage(data, options);
        compressed.set(name, blob);
      } catch (error) {
        console.error(`Failed to compress ${name}:`, error);
        // Keep original if compression fails
        if (data instanceof Blob) {
          compressed.set(name, data);
        }
      }
    })
  );

  return compressed;
}

/**
 * Optimize complete LaTeX export package
 */
export async function optimizeLatexExport(
  document: {
    content: string;
    images?: Array<{ name: string; data: string | Blob }>;
    bibliography?: string;
  },
  options: ExportOptimizationOptions = {}
): Promise<OptimizedExport> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

  // Optimize LaTeX content
  let content = optimizeLatexContent(document.content, opts);

  // Calculate original size
  const originalSize =
    new Blob([document.content]).size +
    (document.images?.reduce(
      (sum, img) =>
        sum + (img.data instanceof Blob ? img.data.size : img.data.length),
      0
    ) || 0);

  // Compress images if requested
  const assets = new Map<string, Blob>();

  if (document.images && opts.compressImages) {
    const compressed = await compressImages(document.images, {
      quality: opts.imageQuality,
    });
    compressed.forEach((blob, name) => assets.set(name, blob));
  } else if (document.images) {
    // Use original images
    document.images.forEach(({ name, data }) => {
      if (data instanceof Blob) {
        assets.set(name, data);
      }
    });
  }

  // Add bibliography if present
  if (document.bibliography) {
    const bibContent = optimizeLatexContent(document.bibliography, opts);
    assets.set(
      "references.bib",
      new Blob([bibContent], { type: "text/plain" })
    );
  }

  // Calculate optimized size
  const size =
    new Blob([content]).size +
    Array.from(assets.values()).reduce((sum, blob) => sum + blob.size, 0);

  const compressionRatio = originalSize > 0 ? size / originalSize : 1;

  return {
    content,
    assets,
    size,
    originalSize,
    compressionRatio,
  };
}

/**
 * Generate optimized file structure for Overleaf export
 */
export function generateOverleafStructure(
  document: {
    content: string;
    title?: string;
    author?: string;
    bibliography?: string;
  }
): Map<string, string> {
  const files = new Map<string, string>();

  // Main document
  files.set("main.tex", document.content);

  // Latexmkrc for build configuration
  files.set(
    "latexmkrc",
    `$pdf_mode = 1;
$pdflatex = 'pdflatex -interaction=nonstopmode -synctex=1 %O %S';
$bibtex_use = 2;
`
  );

  // README with instructions
  files.set(
    "README.md",
    `# ${document.title || "Document"}

${document.author ? `Author: ${document.author}\n` : ""}
Generated by Type-It-Up

## Building

This document can be compiled with:

\`\`\`bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
\`\`\`

Or use latexmk for automatic compilation:

\`\`\`bash
latexmk -pdf main.tex
\`\`\`

## Files

- \`main.tex\` - Main document
${document.bibliography ? "- `references.bib` - Bibliography\n" : ""}
`
  );

  return files;
}

/**
 * Estimate export size without actually generating
 */
export function estimateExportSize(document: {
  content: string;
  images?: Array<{ name: string; data: string | Blob }>;
  bibliography?: string;
}): {
  estimated: number;
  breakdown: { content: number; images: number; bibliography: number };
} {
  const contentSize = new Blob([document.content]).size;
  const bibSize = document.bibliography
    ? new Blob([document.bibliography]).size
    : 0;
  const imageSize =
    document.images?.reduce(
      (sum, img) =>
        sum + (img.data instanceof Blob ? img.data.size : img.data.length),
      0
    ) || 0;

  return {
    estimated: contentSize + imageSize + bibSize,
    breakdown: {
      content: contentSize,
      images: imageSize,
      bibliography: bibSize,
    },
  };
}

/**
 * Clean up temporary LaTeX artifacts
 */
export function cleanLatexArtifacts(content: string): string {
  // Remove common LaTeX auxiliary comments
  let cleaned = content;

  // Remove auto-generated comments
  cleaned = cleaned.replace(/% auto-generated by .*/gi, "");

  // Remove empty figure environments
  cleaned = cleaned.replace(
    /\\begin\{figure\}\s*\\end\{figure\}/g,
    ""
  );

  // Remove duplicate labels
  const labels = new Set<string>();
  cleaned = cleaned.replace(
    /\\label\{(.*?)\}/g,
    (match, label) => {
      if (labels.has(label)) {
        return "";
      }
      labels.add(label);
      return match;
    }
  );

  return cleaned;
}

/**
 * Validate export package integrity
 */
export function validateExport(exported: OptimizedExport): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if content is empty
  if (exported.content.trim().length === 0) {
    errors.push("Export content is empty");
  }

  // Check for unclosed environments
  const beginCount = (exported.content.match(/\\begin\{/g) || []).length;
  const endCount = (exported.content.match(/\\end\{/g) || []).length;

  if (beginCount !== endCount) {
    errors.push(
      `Mismatched environments: ${beginCount} \\begin, ${endCount} \\end`
    );
  }

  // Check for missing image references
  const imageRefs = exported.content.match(/\\includegraphics.*?\{(.*?)\}/g) || [];
  for (const ref of imageRefs) {
    const match = ref.match(/\{(.*?)\}/);
    if (match) {
      const filename = match[1];
      if (!exported.assets.has(filename)) {
        warnings.push(`Referenced image not found: ${filename}`);
      }
    }
  }

  // Warn about large export size
  const sizeMB = exported.size / 1024 / 1024;
  if (sizeMB > 50) {
    warnings.push(`Export size is large: ${sizeMB.toFixed(2)}MB`);
  }

  // Check compression effectiveness
  if (exported.compressionRatio > 0.95) {
    warnings.push(
      `Low compression ratio (${(exported.compressionRatio * 100).toFixed(1)}%). Consider enabling image compression.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
