/**
 * @fileoverview Document Templates Library
 * @module lib/document-templates
 *
 * Provides predefined LaTeX document templates for common use cases:
 * - Academic papers (IEEE, ACM, AMS)
 * - Reports and technical documentation
 * - Presentations (Beamer slides)
 * - Homework assignments
 * - Resumes/CVs
 *
 * Each template includes appropriate packages, formatting, and
 * placeholder structure for quick document creation.
 *
 * @example
 * ```typescript
 * import { getTemplate, listTemplates, TemplateCategory } from './document-templates';
 *
 * const template = getTemplate('ieee-paper');
 * console.log(template.latex); // Full LaTeX preamble and structure
 *
 * // List templates by category
 * const academicTemplates = listTemplates('academic');
 * ```
 */

export type TemplateCategory = 'academic' | 'report' | 'presentation' | 'assignment' | 'resume' | 'letter';

export interface DocumentTemplate {
  /** Unique template identifier */
  id: string;
  /** Human-readable template name */
  name: string;
  /** Template category */
  category: TemplateCategory;
  /** Short description */
  description: string;
  /** LaTeX document class */
  documentClass: string;
  /** Required LaTeX packages */
  packages: string[];
  /** Full LaTeX template with placeholders */
  latex: string;
  /** Placeholder variables in the template */
  placeholders: TemplatePlaceholder[];
  /** Preview thumbnail (optional) */
  previewImage?: string;
}

export interface TemplatePlaceholder {
  /** Placeholder key (e.g., "TITLE") */
  key: string;
  /** Human-readable label */
  label: string;
  /** Default value */
  defaultValue: string;
  /** Whether this placeholder is required */
  required: boolean;
}

/**
 * IEEE conference paper template
 */
const ieeeTemplate: DocumentTemplate = {
  id: 'ieee-paper',
  name: 'IEEE Conference Paper',
  category: 'academic',
  description: 'Two-column IEEE conference paper format with abstract and keywords',
  documentClass: 'IEEEtran',
  packages: ['cite', 'amsmath', 'graphicx', 'algorithmic', 'array'],
  placeholders: [
    { key: 'TITLE', label: 'Paper Title', defaultValue: 'Your Paper Title Here', required: true },
    { key: 'AUTHOR', label: 'Author Name', defaultValue: 'Author Name', required: true },
    { key: 'AFFILIATION', label: 'Affiliation', defaultValue: 'University Name', required: false },
    { key: 'EMAIL', label: 'Email', defaultValue: 'author@university.edu', required: false },
    { key: 'ABSTRACT', label: 'Abstract', defaultValue: 'Your abstract here...', required: true },
    { key: 'KEYWORDS', label: 'Keywords', defaultValue: 'keyword1, keyword2, keyword3', required: false },
  ],
  latex: `\\documentclass[conference]{IEEEtran}
\\usepackage{cite}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\begin{document}

\\title{{{TITLE}}}

\\author{\\IEEEauthorblockN{{{AUTHOR}}}
\\IEEEauthorblockA{{{AFFILIATION}}\\\\
{{EMAIL}}}}

\\maketitle

\\begin{abstract}
{{ABSTRACT}}
\\end{abstract}

\\begin{IEEEkeywords}
{{KEYWORDS}}
\\end{IEEEkeywords}

\\section{Introduction}
Your introduction here...

\\section{Related Work}
Related work discussion...

\\section{Methodology}
Your methodology here...

\\section{Results}
Your results here...

\\section{Conclusion}
Your conclusion here...

\\bibliographystyle{IEEEtran}
\\bibliography{references}

\\end{document}
`,
};

/**
 * ACM conference paper template
 */
const acmTemplate: DocumentTemplate = {
  id: 'acm-paper',
  name: 'ACM Conference Paper',
  category: 'academic',
  description: 'ACM two-column conference paper format',
  documentClass: 'acmart',
  packages: ['amsmath', 'graphicx', 'booktabs'],
  placeholders: [
    { key: 'TITLE', label: 'Paper Title', defaultValue: 'Your Paper Title', required: true },
    { key: 'AUTHOR', label: 'Author Name', defaultValue: 'Author Name', required: true },
    { key: 'INSTITUTION', label: 'Institution', defaultValue: 'University Name', required: false },
    { key: 'ABSTRACT', label: 'Abstract', defaultValue: 'Your abstract...', required: true },
  ],
  latex: `\\documentclass[sigconf,review]{acmart}

\\begin{document}

\\title{{{TITLE}}}

\\author{{{AUTHOR}}}
\\affiliation{%
  \\institution{{{INSTITUTION}}}
}

\\begin{abstract}
{{ABSTRACT}}
\\end{abstract}

\\maketitle

\\section{Introduction}
Your introduction here...

\\section{Background}
Background and related work...

\\section{Approach}
Your approach here...

\\section{Evaluation}
Evaluation and results...

\\section{Conclusion}
Your conclusion here...

\\bibliographystyle{ACM-Reference-Format}
\\bibliography{references}

\\end{document}
`,
};

/**
 * AMS mathematics article template
 */
const amsTemplate: DocumentTemplate = {
  id: 'ams-article',
  name: 'AMS Math Article',
  category: 'academic',
  description: 'American Mathematical Society article format for mathematical papers',
  documentClass: 'amsart',
  packages: ['amsmath', 'amssymb', 'amsthm', 'hyperref'],
  placeholders: [
    { key: 'TITLE', label: 'Title', defaultValue: 'Your Mathematical Paper', required: true },
    { key: 'AUTHOR', label: 'Author', defaultValue: 'Author Name', required: true },
    { key: 'ABSTRACT', label: 'Abstract', defaultValue: 'Abstract...', required: true },
    { key: 'SUBJECT', label: 'Subject Classification', defaultValue: '00A00', required: false },
  ],
  latex: `\\documentclass{amsart}
\\usepackage{amsmath,amssymb,amsthm}
\\usepackage{hyperref}

\\theoremstyle{plain}
\\newtheorem{theorem}{Theorem}[section]
\\newtheorem{lemma}[theorem]{Lemma}
\\newtheorem{corollary}[theorem]{Corollary}
\\newtheorem{proposition}[theorem]{Proposition}

\\theoremstyle{definition}
\\newtheorem{definition}[theorem]{Definition}
\\newtheorem{example}[theorem]{Example}

\\theoremstyle{remark}
\\newtheorem{remark}[theorem]{Remark}

\\begin{document}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}

\\begin{abstract}
{{ABSTRACT}}
\\end{abstract}

\\subjclass[2020]{{{SUBJECT}}}

\\maketitle

\\section{Introduction}
Your introduction here...

\\section{Preliminaries}
\\begin{definition}
Define key concepts here...
\\end{definition}

\\section{Main Results}
\\begin{theorem}
State your main theorem...
\\end{theorem}

\\begin{proof}
Your proof here...
\\end{proof}

\\section{Conclusion}
Your conclusion here...

\\bibliographystyle{amsplain}
\\bibliography{references}

\\end{document}
`,
};

/**
 * Technical report template
 */
const technicalReportTemplate: DocumentTemplate = {
  id: 'technical-report',
  name: 'Technical Report',
  category: 'report',
  description: 'Clean technical report format with table of contents and sections',
  documentClass: 'report',
  packages: ['graphicx', 'hyperref', 'geometry', 'fancyhdr', 'listings'],
  placeholders: [
    { key: 'TITLE', label: 'Report Title', defaultValue: 'Technical Report', required: true },
    { key: 'AUTHOR', label: 'Author', defaultValue: 'Author Name', required: true },
    { key: 'ORGANIZATION', label: 'Organization', defaultValue: 'Organization Name', required: false },
    { key: 'DATE', label: 'Date', defaultValue: '\\today', required: false },
  ],
  latex: `\\documentclass[11pt]{report}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{fancyhdr}
\\usepackage{listings}
\\usepackage{xcolor}

\\lstset{
  basicstyle=\\ttfamily\\small,
  breaklines=true,
  frame=single,
  backgroundcolor=\\color{gray!10}
}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{{{TITLE}}}
\\fancyhead[R]{\\thepage}

\\begin{document}

\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\Huge\\bfseries {{TITLE}}\\par}
\\vspace{2cm}
{\\Large {{AUTHOR}}\\par}
\\vspace{0.5cm}
{\\large {{ORGANIZATION}}\\par}
\\vspace{2cm}
{\\large {{DATE}}\\par}
\\vfill
\\end{titlepage}

\\tableofcontents
\\newpage

\\chapter{Executive Summary}
Summary of the report...

\\chapter{Introduction}
\\section{Background}
Background information...

\\section{Objectives}
Report objectives...

\\chapter{Methodology}
\\section{Approach}
Your approach...

\\chapter{Results}
\\section{Findings}
Your findings...

\\chapter{Conclusion}
\\section{Summary}
Summary of conclusions...

\\section{Recommendations}
Recommendations for future work...

\\appendix
\\chapter{Additional Materials}
Supplementary information...

\\end{document}
`,
};

/**
 * Beamer presentation template
 */
const beamerTemplate: DocumentTemplate = {
  id: 'beamer-slides',
  name: 'Beamer Presentation',
  category: 'presentation',
  description: 'Modern Beamer slide deck with clean design',
  documentClass: 'beamer',
  packages: ['graphicx', 'tikz', 'booktabs'],
  placeholders: [
    { key: 'TITLE', label: 'Presentation Title', defaultValue: 'Your Presentation', required: true },
    { key: 'AUTHOR', label: 'Presenter', defaultValue: 'Your Name', required: true },
    { key: 'INSTITUTION', label: 'Institution', defaultValue: 'University/Company', required: false },
    { key: 'DATE', label: 'Date', defaultValue: '\\today', required: false },
  ],
  latex: `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{default}
\\usepackage{graphicx}
\\usepackage{tikz}
\\usepackage{booktabs}

\\title{{{TITLE}}}
\\author{{{AUTHOR}}}
\\institute{{{INSTITUTION}}}
\\date{{{DATE}}}

\\begin{document}

\\begin{frame}
\\titlepage
\\end{frame}

\\begin{frame}{Outline}
\\tableofcontents
\\end{frame}

\\section{Introduction}

\\begin{frame}{Introduction}
\\begin{itemize}
\\item First point
\\item Second point
\\item Third point
\\end{itemize}
\\end{frame}

\\section{Main Content}

\\begin{frame}{Key Concepts}
\\begin{block}{Definition}
Your definition here...
\\end{block}

\\begin{alertblock}{Important}
Important note...
\\end{alertblock}
\\end{frame}

\\begin{frame}{Results}
\\begin{columns}
\\column{0.5\\textwidth}
Left column content...

\\column{0.5\\textwidth}
Right column content...
\\end{columns}
\\end{frame}

\\section{Conclusion}

\\begin{frame}{Conclusion}
\\begin{enumerate}
\\item Summary point 1
\\item Summary point 2
\\item Summary point 3
\\end{enumerate}
\\end{frame}

\\begin{frame}{Questions?}
\\centering
\\Large Thank you!\\\\
\\vspace{1cm}
\\normalsize Questions and Discussion
\\end{frame}

\\end{document}
`,
};

/**
 * Homework assignment template
 */
const homeworkTemplate: DocumentTemplate = {
  id: 'homework',
  name: 'Homework Assignment',
  category: 'assignment',
  description: 'Clean homework/problem set format with numbered problems',
  documentClass: 'article',
  packages: ['amsmath', 'amssymb', 'enumerate', 'geometry', 'fancyhdr'],
  placeholders: [
    { key: 'COURSE', label: 'Course Name', defaultValue: 'Course Name', required: true },
    { key: 'ASSIGNMENT', label: 'Assignment Number', defaultValue: 'Homework 1', required: true },
    { key: 'STUDENT', label: 'Student Name', defaultValue: 'Your Name', required: true },
    { key: 'DATE', label: 'Due Date', defaultValue: '\\today', required: false },
  ],
  latex: `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{enumerate}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{{{COURSE}}}
\\fancyhead[C]{{{ASSIGNMENT}}}
\\fancyhead[R]{{{STUDENT}}}
\\fancyfoot[C]{\\thepage}

\\newcommand{\\problem}[1]{\\section*{Problem #1}}
\\newcommand{\\solution}{\\subsection*{Solution}}

\\begin{document}

\\begin{center}
{\\Large\\bfseries {{COURSE}}}\\\\[0.5em]
{\\large {{ASSIGNMENT}}}\\\\[0.5em]
{{STUDENT}}\\\\
Due: {{DATE}}
\\end{center}

\\hrule
\\vspace{1em}

\\problem{1}
State the problem here...

\\solution
Your solution here...

\\problem{2}
State the problem here...

\\solution
Your solution here...

\\problem{3}
State the problem here...

\\solution
Your solution here...

\\end{document}
`,
};

/**
 * Modern resume/CV template
 */
const resumeTemplate: DocumentTemplate = {
  id: 'resume',
  name: 'Modern Resume',
  category: 'resume',
  description: 'Clean, professional resume/CV template',
  documentClass: 'article',
  packages: ['geometry', 'hyperref', 'titlesec', 'enumitem', 'xcolor'],
  placeholders: [
    { key: 'NAME', label: 'Full Name', defaultValue: 'Your Name', required: true },
    { key: 'EMAIL', label: 'Email', defaultValue: 'email@example.com', required: true },
    { key: 'PHONE', label: 'Phone', defaultValue: '+1 (555) 123-4567', required: false },
    { key: 'LINKEDIN', label: 'LinkedIn', defaultValue: 'linkedin.com/in/yourprofile', required: false },
    { key: 'LOCATION', label: 'Location', defaultValue: 'City, State', required: false },
  ],
  latex: `\\documentclass[11pt]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{xcolor}

\\definecolor{headercolor}{RGB}{0, 51, 102}

\\titleformat{\\section}{\\large\\bfseries\\color{headercolor}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\setlist[itemize]{leftmargin=*, nosep}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Huge\\bfseries {{NAME}}}\\\\[0.5em]
{{EMAIL}} | {{PHONE}} | {{LOCATION}}\\\\
\\href{https://{{LINKEDIN}}}{{{LINKEDIN}}}
\\end{center}

\\section{Education}
\\textbf{University Name}, City, State \\hfill Expected May 20XX\\\\
Bachelor of Science in Computer Science \\hfill GPA: X.XX/4.00

\\section{Experience}
\\textbf{Company Name} \\hfill City, State\\\\
\\textit{Job Title} \\hfill Month Year -- Present
\\begin{itemize}
\\item Accomplishment or responsibility 1
\\item Accomplishment or responsibility 2
\\item Accomplishment or responsibility 3
\\end{itemize}

\\textbf{Previous Company} \\hfill City, State\\\\
\\textit{Previous Role} \\hfill Month Year -- Month Year
\\begin{itemize}
\\item Accomplishment or responsibility 1
\\item Accomplishment or responsibility 2
\\end{itemize}

\\section{Projects}
\\textbf{Project Name} | \\textit{Technologies used}
\\begin{itemize}
\\item Brief description of what you built and impact
\\end{itemize}

\\section{Skills}
\\textbf{Programming:} Python, JavaScript, TypeScript, Java, C++\\\\
\\textbf{Technologies:} React, Node.js, PostgreSQL, Docker, AWS\\\\
\\textbf{Tools:} Git, Linux, VS Code, Jira

\\end{document}
`,
};

/**
 * Formal letter template
 */
const letterTemplate: DocumentTemplate = {
  id: 'formal-letter',
  name: 'Formal Letter',
  category: 'letter',
  description: 'Professional formal letter format',
  documentClass: 'letter',
  packages: ['geometry', 'hyperref'],
  placeholders: [
    { key: 'SENDER_NAME', label: 'Your Name', defaultValue: 'Your Name', required: true },
    { key: 'SENDER_ADDRESS', label: 'Your Address', defaultValue: '123 Your Street\\\\City, State ZIP', required: true },
    { key: 'RECIPIENT_NAME', label: 'Recipient Name', defaultValue: 'Recipient Name', required: true },
    { key: 'RECIPIENT_ADDRESS', label: 'Recipient Address', defaultValue: '456 Their Street\\\\City, State ZIP', required: true },
    { key: 'SUBJECT', label: 'Subject', defaultValue: 'Subject Line', required: false },
    { key: 'DATE', label: 'Date', defaultValue: '\\today', required: false },
  ],
  latex: `\\documentclass{letter}
\\usepackage[margin=1in]{geometry}
\\usepackage{hyperref}

\\signature{{{SENDER_NAME}}}
\\address{{{SENDER_ADDRESS}}}

\\begin{document}
\\begin{letter}{{{RECIPIENT_NAME}}\\\\{{RECIPIENT_ADDRESS}}}

\\opening{Dear {{RECIPIENT_NAME}},}

\\textbf{Re: {{SUBJECT}}}

First paragraph introducing the purpose of your letter...

Second paragraph with main content and details...

Third paragraph with any additional information or requests...

\\closing{Sincerely,}

\\end{letter}
\\end{document}
`,
};

// Template registry
const templates: Map<string, DocumentTemplate> = new Map([
  ['ieee-paper', ieeeTemplate],
  ['acm-paper', acmTemplate],
  ['ams-article', amsTemplate],
  ['technical-report', technicalReportTemplate],
  ['beamer-slides', beamerTemplate],
  ['homework', homeworkTemplate],
  ['resume', resumeTemplate],
  ['formal-letter', letterTemplate],
]);

/**
 * Get a template by ID
 *
 * @param templateId - The unique template identifier
 * @returns The template or undefined if not found
 *
 * @example
 * ```typescript
 * const template = getTemplate('ieee-paper');
 * if (template) {
 *   console.log(template.latex);
 * }
 * ```
 */
export function getTemplate(templateId: string): DocumentTemplate | undefined {
  return templates.get(templateId);
}

/**
 * List all available templates, optionally filtered by category
 *
 * @param category - Optional category filter
 * @returns Array of templates matching the filter
 *
 * @example
 * ```typescript
 * const allTemplates = listTemplates();
 * const academicTemplates = listTemplates('academic');
 * ```
 */
export function listTemplates(category?: TemplateCategory): DocumentTemplate[] {
  const allTemplates = Array.from(templates.values());
  if (category) {
    return allTemplates.filter((t) => t.category === category);
  }
  return allTemplates;
}

/**
 * Get templates grouped by category
 *
 * @returns Object with categories as keys and template arrays as values
 *
 * @example
 * ```typescript
 * const grouped = getTemplatesByCategory();
 * console.log(grouped.academic); // Array of academic templates
 * ```
 */
export function getTemplatesByCategory(): Record<TemplateCategory, DocumentTemplate[]> {
  const grouped: Record<TemplateCategory, DocumentTemplate[]> = {
    academic: [],
    report: [],
    presentation: [],
    assignment: [],
    resume: [],
    letter: [],
  };

  for (const template of templates.values()) {
    grouped[template.category].push(template);
  }

  return grouped;
}

/**
 * Render a template with provided values
 *
 * @param templateId - Template to render
 * @param values - Object mapping placeholder keys to values
 * @returns Rendered LaTeX string with placeholders replaced
 *
 * @example
 * ```typescript
 * const latex = renderTemplate('homework', {
 *   COURSE: 'CS 101',
 *   ASSIGNMENT: 'Homework 3',
 *   STUDENT: 'Jane Doe',
 * });
 * ```
 */
export function renderTemplate(
  templateId: string,
  values: Record<string, string>
): string | undefined {
  const template = templates.get(templateId);
  if (!template) return undefined;

  let rendered = template.latex;

  for (const placeholder of template.placeholders) {
    const value = values[placeholder.key] ?? placeholder.defaultValue;
    // Replace both {{KEY}} and {{{KEY}}} patterns
    rendered = rendered.replace(new RegExp(`\\{\\{\\{?${placeholder.key}\\}?\\}\\}`, 'g'), value);
  }

  return rendered;
}

/**
 * Validate template values and return missing required fields
 *
 * @param templateId - Template to validate against
 * @param values - Values to validate
 * @returns Array of missing required placeholder keys
 */
export function validateTemplateValues(
  templateId: string,
  values: Record<string, string>
): string[] {
  const template = templates.get(templateId);
  if (!template) return [];

  const missing: string[] = [];
  for (const placeholder of template.placeholders) {
    if (placeholder.required && !values[placeholder.key]) {
      missing.push(placeholder.key);
    }
  }

  return missing;
}

/**
 * Get all available categories
 *
 * @returns Array of template category names
 */
export function getCategories(): TemplateCategory[] {
  return ['academic', 'report', 'presentation', 'assignment', 'resume', 'letter'];
}
