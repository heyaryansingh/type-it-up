/**
 * LaTeX Table Generator - Convert data to beautifully formatted LaTeX tables
 *
 * Features:
 * - CSV/JSON to LaTeX table conversion
 * - Automatic column formatting and alignment
 * - Support for booktabs styling
 * - Multi-row and multi-column support
 * - Automatic number formatting
 * - Color and highlighting support
 */

export interface TableColumn {
  key: string;
  header: string;
  align?: 'l' | 'c' | 'r';
  format?: 'number' | 'percentage' | 'currency' | 'text';
  decimals?: number;
  width?: string;
}

export interface TableOptions {
  caption?: string;
  label?: string;
  position?: string;
  booktabs?: boolean;
  alternateRowColors?: boolean;
  fontSize?: 'tiny' | 'scriptsize' | 'footnotesize' | 'small' | 'normalsize' | 'large';
  landscape?: boolean;
  longtable?: boolean;
  highlightRows?: number[];
  highlightCols?: number[];
}

export interface MultiCell {
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  content: string;
}

export class LaTeXTableGenerator {
  private columns: TableColumn[];
  private data: any[];
  private options: TableOptions;

  constructor(
    columns: TableColumn[],
    data: any[],
    options: TableOptions = {}
  ) {
    this.columns = columns;
    this.data = data;
    this.options = {
      booktabs: true,
      alternateRowColors: false,
      fontSize: 'normalsize',
      landscape: false,
      longtable: false,
      ...options
    };
  }

  /**
   * Generate complete LaTeX table
   */
  generate(): string {
    const parts: string[] = [];

    // Add landscape environment if needed
    if (this.options.landscape) {
      parts.push('\\begin{landscape}');
    }

    // Add font size
    if (this.options.fontSize !== 'normalsize') {
      parts.push(`\\${this.options.fontSize}`);
    }

    // Table environment
    if (this.options.longtable) {
      parts.push(this.generateLongTable());
    } else {
      parts.push(this.generateRegularTable());
    }

    // Close landscape
    if (this.options.landscape) {
      parts.push('\\end{landscape}');
    }

    return parts.join('\n');
  }

  /**
   * Generate regular table (table + tabular)
   */
  private generateRegularTable(): string {
    const parts: string[] = [];

    // Table environment
    const position = this.options.position || 'htbp';
    parts.push(`\\begin{table}[${position}]`);
    parts.push('  \\centering');

    // Caption and label
    if (this.options.caption) {
      parts.push(`  \\caption{${this.options.caption}}`);
    }
    if (this.options.label) {
      parts.push(`  \\label{${this.options.label}}`);
    }

    // Tabular environment
    parts.push(this.generateTabular());

    parts.push('\\end{table}');

    return parts.join('\n');
  }

  /**
   * Generate long table (for multi-page tables)
   */
  private generateLongTable(): string {
    const parts: string[] = [];
    const colSpec = this.generateColumnSpec();

    parts.push(`\\begin{longtable}{${colSpec}}`);

    // Caption
    if (this.options.caption) {
      parts.push(`\\caption{${this.options.caption}} \\\\`);
    }

    // Header (first page)
    parts.push(this.generateHeader());
    parts.push('\\endfirsthead');

    // Header (continuation)
    parts.push('\\multicolumn{' + this.columns.length + '}{c}%');
    parts.push('{\\tablename\\ \\thetable\\ -- continued from previous page} \\\\');
    parts.push(this.generateHeader());
    parts.push('\\endhead');

    // Footer
    parts.push('\\hline');
    parts.push('\\multicolumn{' + this.columns.length + '}{r}{Continued on next page} \\\\');
    parts.push('\\endfoot');
    parts.push('\\endlastfoot');

    // Data rows
    parts.push(this.generateRows());

    parts.push('\\end{longtable}');

    return parts.join('\n');
  }

  /**
   * Generate tabular environment
   */
  private generateTabular(): string {
    const parts: string[] = [];
    const colSpec = this.generateColumnSpec();

    // Add row colors package if needed
    if (this.options.alternateRowColors) {
      parts.push('  \\rowcolors{2}{gray!25}{white}');
    }

    parts.push(`  \\begin{tabular}{${colSpec}}`);

    // Add booktabs rules
    if (this.options.booktabs) {
      parts.push('    \\toprule');
    } else {
      parts.push('    \\hline');
    }

    // Header
    parts.push(this.generateHeader());

    // Data rows
    parts.push(this.generateRows());

    // Bottom rule
    if (this.options.booktabs) {
      parts.push('    \\bottomrule');
    } else {
      parts.push('    \\hline');
    }

    parts.push('  \\end{tabular}');

    return parts.join('\n');
  }

  /**
   * Generate column specification
   */
  private generateColumnSpec(): string {
    return this.columns.map(col => {
      const align = col.align || this.inferAlignment(col.format);
      if (col.width) {
        return `p{${col.width}}`;
      }
      return align;
    }).join('');
  }

  /**
   * Infer column alignment from format
   */
  private inferAlignment(format?: string): 'l' | 'c' | 'r' {
    if (format === 'number' || format === 'percentage' || format === 'currency') {
      return 'r';
    }
    return 'l';
  }

  /**
   * Generate table header
   */
  private generateHeader(): string {
    const headers = this.columns.map(col => `\\textbf{${col.header}}`);
    let headerRow = '    ' + headers.join(' & ') + ' \\\\';

    if (this.options.booktabs) {
      headerRow += '\n    \\midrule';
    } else {
      headerRow += '\n    \\hline';
    }

    return headerRow;
  }

  /**
   * Generate data rows
   */
  private generateRows(): string {
    const rows: string[] = [];

    this.data.forEach((row, rowIndex) => {
      const cells = this.columns.map(col => {
        const value = row[col.key];
        return this.formatCell(value, col);
      });

      let rowStr = '    ' + cells.join(' & ') + ' \\\\';

      // Add row highlighting
      if (this.options.highlightRows?.includes(rowIndex)) {
        rowStr = '    \\rowcolor{yellow!30} ' + cells.join(' & ') + ' \\\\';
      }

      rows.push(rowStr);
    });

    return rows.join('\n');
  }

  /**
   * Format cell value
   */
  private formatCell(value: any, column: TableColumn): string {
    if (value === null || value === undefined) {
      return '--';
    }

    switch (column.format) {
      case 'number':
        return this.formatNumber(value, column.decimals);
      case 'percentage':
        return this.formatPercentage(value, column.decimals);
      case 'currency':
        return this.formatCurrency(value, column.decimals);
      default:
        return this.escapeLatex(String(value));
    }
  }

  /**
   * Format number
   */
  private formatNumber(value: any, decimals: number = 2): string {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return this.escapeLatex(String(value));
    }
    return num.toFixed(decimals);
  }

  /**
   * Format percentage
   */
  private formatPercentage(value: any, decimals: number = 1): string {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return this.escapeLatex(String(value));
    }
    return `${(num * 100).toFixed(decimals)}\\%`;
  }

  /**
   * Format currency
   */
  private formatCurrency(value: any, decimals: number = 2): string {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return this.escapeLatex(String(value));
    }
    return `\\$${num.toFixed(decimals)}`;
  }

  /**
   * Escape LaTeX special characters
   */
  private escapeLatex(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/[&%$#_{}]/g, '\\$&')
      .replace(/\^/g, '\\textasciicircum{}')
      .replace(/~/g, '\\textasciitilde{}');
  }

  /**
   * Get required LaTeX packages
   */
  static getRequiredPackages(options: TableOptions = {}): string[] {
    const packages: string[] = [];

    if (options.booktabs) {
      packages.push('booktabs');
    }

    if (options.alternateRowColors) {
      packages.push('[table]{xcolor}');
    }

    if (options.landscape) {
      packages.push('pdflscape');
    }

    if (options.longtable) {
      packages.push('longtable');
    }

    return packages;
  }
}

/**
 * Convert CSV string to LaTeX table
 */
export function csvToLatex(
  csv: string,
  options: TableOptions = {}
): string {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  // Create columns
  const columns: TableColumn[] = headers.map(header => ({
    key: header.toLowerCase().replace(/\s+/g, '_'),
    header: header,
  }));

  // Parse data rows
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((header, i) => {
      const key = header.toLowerCase().replace(/\s+/g, '_');
      row[key] = values[i];
    });
    return row;
  });

  const generator = new LaTeXTableGenerator(columns, data, options);
  return generator.generate();
}

/**
 * Convert JSON array to LaTeX table
 */
export function jsonToLatex(
  json: any[],
  columnConfig?: TableColumn[],
  options: TableOptions = {}
): string {
  if (json.length === 0) {
    throw new Error('Empty data array');
  }

  // Auto-generate columns if not provided
  const columns = columnConfig || Object.keys(json[0]).map(key => ({
    key,
    header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
  }));

  const generator = new LaTeXTableGenerator(columns, json, options);
  return generator.generate();
}

/**
 * Create comparison table with highlighting
 */
export function createComparisonTable(
  data: any[],
  compareColumns: string[],
  options: TableOptions = {}
): string {
  // Auto-detect numeric columns for comparison
  const numericCols = compareColumns.filter(col => {
    return data.every(row => !isNaN(parseFloat(row[col])));
  });

  // Find best/worst values for highlighting
  const highlighted: number[] = [];
  numericCols.forEach(col => {
    const values = data.map((row, idx) => ({
      idx,
      val: parseFloat(row[col])
    }));
    const max = Math.max(...values.map(v => v.val));
    const maxIdx = values.find(v => v.val === max)?.idx;
    if (maxIdx !== undefined && !highlighted.includes(maxIdx)) {
      highlighted.push(maxIdx);
    }
  });

  const columns: TableColumn[] = Object.keys(data[0]).map(key => ({
    key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
    format: numericCols.includes(key) ? 'number' : 'text',
  }));

  const generator = new LaTeXTableGenerator(columns, data, {
    ...options,
    highlightRows: highlighted,
  });

  return generator.generate();
}

/**
 * Create financial statement table
 */
export function createFinancialTable(
  data: any[],
  options: TableOptions = {}
): string {
  const columns: TableColumn[] = [
    { key: 'item', header: 'Item', align: 'l' },
    { key: 'amount', header: 'Amount', format: 'currency', decimals: 0 },
    { key: 'percentage', header: '\\% of Total', format: 'percentage', decimals: 1 },
  ];

  return new LaTeXTableGenerator(columns, data, {
    booktabs: true,
    fontSize: 'small',
    ...options,
  }).generate();
}

// Example usage
if (require.main === module) {
  // Example data
  const data = [
    { name: 'Alice', age: 25, score: 92.5, grade: 'A' },
    { name: 'Bob', age: 23, score: 87.3, grade: 'B+' },
    { name: 'Charlie', age: 24, score: 95.1, grade: 'A+' },
  ];

  const columns: TableColumn[] = [
    { key: 'name', header: 'Name', align: 'l' },
    { key: 'age', header: 'Age', format: 'number', decimals: 0 },
    { key: 'score', header: 'Score', format: 'number', decimals: 1 },
    { key: 'grade', header: 'Grade', align: 'c' },
  ];

  const options: TableOptions = {
    caption: 'Student Performance Data',
    label: 'tab:students',
    booktabs: true,
    alternateRowColors: true,
  };

  const generator = new LaTeXTableGenerator(columns, data, options);
  console.log(generator.generate());

  // Required packages
  console.log('\n% Required packages:');
  LaTeXTableGenerator.getRequiredPackages(options).forEach(pkg => {
    console.log(`% \\usepackage{${pkg}}`);
  });
}
