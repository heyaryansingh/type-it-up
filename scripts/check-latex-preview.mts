// Check: every display-math block in the live preview parses in KaTeX.
// Run: npx tsx scripts/check-latex-preview.mts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import katex from "katex";

// math-renderer imports katex CSS, which node can't load; stub it out
createRequire(import.meta.url).extensions[".css"] = () => {};
const { parseLatexToReact } = await import("../lib/latex-to-html.tsx");

const doc = String.raw`\begin{document}
\begin{align}
a &= b + c \\[2pt]
d &= e
\end{align}
\begin{align*}
x &= 1
\end{align*}
\begin{equation*}
E = mc^2
\end{equation*}
\[ y = 2 \]
\end{document}`;

const blocks = parseLatexToReact(doc)
    .map((el: any) => el?.props?.children?.props?.latex)
    .filter((s): s is string => typeof s === "string");

assert.equal(blocks.length, 4, `expected 4 math blocks, got ${blocks.length}`);
for (const latex of blocks) katex.renderToString(latex, { displayMode: true, throwOnError: true });
assert.equal(blocks[3], "y = 2");
console.log("latex preview math blocks OK");
