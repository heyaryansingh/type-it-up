/**
 * Self-check: TOC ignores fenced-code '#' lines and LaTeX comments; keeps nested braces in titles.
 * Run with: node --experimental-strip-types scripts/check-toc-headings.mts
 */
import assert from 'node:assert';
import { generateTOC } from '../lib/toc-generator.ts';

const md = generateTOC('# Real\n```bash\n# not a heading\n```\n## Also real\n', { format: 'markdown' });
assert.equal(md.count, 2);

const tex = generateTOC('\\section{A \\textbf{b}}\n% \\section{Gone}\n50\\% \\subsection{Kept}\n', { format: 'latex' });
assert.equal(tex.count, 2);
assert.equal(tex.headings[0].text, 'A \\textbf{b}');
console.log('ok');
