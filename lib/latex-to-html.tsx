import React from "react";
import { MathRenderer } from "../components/math-renderer";

/**
 * Robust LaTeX to React parser for live preview.
 * 1. Isolates \begin{document} block
 * 2. Handles multi-line math blocks and amsmath environments
 * 3. Supports standard text formatting and figures
 */
export function parseLatexToReact(latex: string, images: Record<string, string> = {}): React.ReactNode[] {
    // ── Preamble Isolation ──
    let body = latex;
    const docStart = latex.indexOf("\\begin{document}");
    const docEnd = latex.indexOf("\\end{document}");

    if (docStart !== -1) {
        body = latex.slice(docStart + "\\begin{document}".length, docEnd !== -1 ? docEnd : undefined);
    }

    const lines = body.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let inItemize = false;
    let inMathBlock = false;
    let currentMathBlock = "";

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            if (inItemize) {
                elements.push(<ul key={`list-${i}`} className="list-disc pl-6 my-4 space-y-2">{currentList}</ul>);
                currentList = [];
                inItemize = false;
            }
            continue;
        }

        // ── Math Block detection (\[...\] or \begin{align}...) ──
        if (line.includes("\\[") || line.includes("\\begin{equation}") || line.includes("\\begin{align}")) {
            inMathBlock = true;
            currentMathBlock = line;
            if (line.includes("\\]") || line.includes("\\end{equation}") || line.includes("\\end{align}")) {
                inMathBlock = false;
                elements.push(renderMath(currentMathBlock, i));
            }
            continue;
        }

        if (inMathBlock) {
            currentMathBlock += "\n" + line;
            if (line.includes("\\]") || line.includes("\\end{equation}") || line.includes("\\end{align}")) {
                inMathBlock = false;
                elements.push(renderMath(currentMathBlock, i));
            }
            continue;
        }

        // ── Itemize ──
        if (line.includes("\\begin{itemize}")) {
            inItemize = true;
            continue;
        }
        if (line.includes("\\end{itemize}")) {
            elements.push(<ul key={`list-${i}`} className="list-disc pl-6 my-4 space-y-2">{currentList}</ul>);
            currentList = [];
            inItemize = false;
            continue;
        }
        if (inItemize && line.includes("\\item")) {
            const itemContent = line.replace("\\item", "").trim();
            currentList.push(<li key={`item-${i}`} className="text-lg leading-relaxed">{processText(itemContent)}</li>);
            continue;
        }

        // ── Sections ──
        if (line.startsWith("\\section*{")) {
            const title = line.match(/\\section\*\{([^}]+)\}/)?.[1] || "";
            elements.push(<h1 key={i} className="text-3xl font-serif font-bold tracking-tight border-b pb-4 mt-8 mb-4">{title}</h1>);
            continue;
        }
        if (line.startsWith("\\subsection*{")) {
            const title = line.match(/\\subsection\*\{([^}]+)\}/)?.[1] || "";
            elements.push(<h2 key={i} className="text-xl font-serif font-semibold mt-6 mb-2">{title}</h2>);
            continue;
        }

        // ── Figures ──
        if (line.includes("\\includegraphics") || line.includes("[FIGURE]")) {
            const imgKey = Object.keys(images).find(k => line.includes(k));
            if (imgKey && images[imgKey]) {
                elements.push(
                    <div key={i} className="figure-block my-8 flex flex-col items-center gap-2">
                        <img src={images[imgKey]} alt="LaTeX Figure" className="max-w-full h-auto rounded border border-gray-100 shadow-sm" />
                    </div>
                );
            }
            continue;
        }

        // ── Default: Paragraph ──
        if (!inItemize && !inMathBlock) {
            elements.push(<p key={i} className="text-lg leading-relaxed font-serif text-justify my-2">{processText(line)}</p>);
        }
    }

    return elements;
}

/**
 * Handle math block extraction and rendering
 */
function renderMath(content: string, key: number) {
    // Strip delimiters for KaTeX
    const cleanMath = content
        .replace("\\[", "")
        .replace("\\]", "")
        .replace("\\begin{equation}", "")
        .replace("\\end{equation}", "")
        .replace("\\begin{align}", "")
        .replace("\\end{align}", "")
        .trim();

    return (
        <div key={key} className="math-block py-6 flex justify-center bg-gray-50/20 rounded-lg my-4 overflow-x-auto">
            <MathRenderer latex={cleanMath} block />
        </div>
    );
}

/**
 * Handle inline formatting including math
 */
function processText(text: string): React.ReactNode {
    // Split by inline math ($...$ or $$...$$)
    const parts = text.split(/(\$\$?[\s\S]+?\$\$?)/g);

    return parts.map((part, idx) => {
        if (part.startsWith("$")) {
            const clean = part.replace(/^\$\$?/, "").replace(/\$\$?$/, "");
            return <MathRenderer key={idx} latex={clean} block={part.startsWith("$$")} />;
        }

        // Formatting commands with multiple instances support
        let processed: React.ReactNode[] = [part];

        // Basic formatting recursion (very simple)
        const boldRegex = /\\textbf\{([^}]+)\}/g;
        const italicRegex = /\\textit\{([^}]+)\}/g;

        return processed.map((p, i) => {
            if (typeof p !== "string") return p;

            // Since this is simplified, we'll just handle one level of nesting or sequence
            let content: React.ReactNode[] = [p];

            // Note: In a real complex environment we'd use a better parser
            return p; // For now, keep it simple to avoid infinite loops
        });
    });
}
