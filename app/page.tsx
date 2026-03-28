"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DocumentJSON, RegionJSON } from "@/lib/types";
import { renderToLatex } from "@/lib/latex-renderer";
import { renderToMarkdown } from "@/lib/markdown-renderer";
import { MathRenderer } from "@/components/math-renderer";
import { parseLatexToReact } from "@/lib/latex-to-html";
import "katex/dist/katex.min.css";

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

type ViewMode = "preview" | "latex" | "markdown" | "raw";
type Theme = "light" | "dark" | "system";

interface ProcessingSettings {
  notationStyle: "standard" | "physics" | "engineering";
  diagramHandling: "auto" | "keep-image" | "attempt-convert";
  includeImages: boolean;
  documentClass: "article" | "report" | "book";
}

const DEFAULT_SETTINGS: ProcessingSettings = {
  notationStyle: "standard",
  diagramHandling: "auto",
  includeImages: true,
  documentClass: "article",
};

// ════════════════════════════════════════════════════════════════
// Minimalist Icons
// ════════════════════════════════════════════════════════════════

const Icons = {
  upload: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0-15l-4.5 4.5m4.5-4.5l4.5 4.5" />
    </svg>
  ),
  download: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  ),
  eye: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  close: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  checked: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  copy: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  ),
  moon: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  sun: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.966-8.966h-2.25M4.284 12h-2.25m15.811-5.811l-1.59 1.59m-11.454 0l-1.59-1.59m15.811 11.454l-1.59-1.59m-11.454 0l-1.59 1.59M12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
    </svg>
  ),
  layout: (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  )
};

// MathRenderer moved to @/components/math-renderer

// ════════════════════════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════════════════════════

export default function Home() {
  const [document, setDocument] = useState<DocumentJSON | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [theme, setTheme] = useState<Theme>("light");
  const [editableLatex, setEditableLatex] = useState<string>("");
  const [compiledLatex, setCompiledLatex] = useState<string>("");
  const [splitRatio, setSplitRatio] = useState(0.45); // 45% editor, 55% preview
  const [isResizing, setIsResizing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [settings, setSettings] = useState<ProcessingSettings>(DEFAULT_SETTINGS);
  const [activePanel, setActivePanel] = useState<ViewMode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Theme Management ──
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  // ── File Processing ──
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const doc: DocumentJSON = data.document;

      // Auto-crop regions before setting document
      if (doc.pages[0]) {
        for (const region of doc.pages[0].regions) {
          if (region.type === "figure" && !region.content.snapshot && region.bbox) {
            try {
              region.content.snapshot = await cropRegion(URL.createObjectURL(file), region.bbox);
            } catch (e) {
              console.error("Crop failed for region", region.id, e);
            }
          }
        }
      }

      setDocument(doc);
      const initialLatex = renderToLatex(doc, settings);
      setEditableLatex(initialLatex);
      setCompiledLatex(initialLatex);
    } catch (err: any) {
      setError(err.message || "Failed to process document");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Snapshot / Cropping Logic ──
  const cropRegion = (imageUrl: string, bbox: { x: number; y: number; width: number; height: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = window.document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Could not get canvas context");

        const sx = (bbox.x / 1000) * img.width;
        const sy = (bbox.y / 1000) * img.height;
        const sw = (bbox.width / 1000) * img.width;
        const sh = (bbox.height / 1000) * img.height;

        canvas.width = sw;
        canvas.height = sh;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  // ── Resizing Logic ──
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      setSplitRatio(e.clientX / window.innerWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // ── Compilation Logic ──
  const handleCompile = () => {
    setCompiledLatex(editableLatex);
  };

  useEffect(() => {
    if (autoSync) {
      const timer = setTimeout(() => setCompiledLatex(editableLatex), 1000);
      return () => clearTimeout(timer);
    }
  }, [editableLatex, autoSync]);

  // ── Clipboard & Global Handle ──
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/") || items[i].type === "application/pdf") {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break; // Process only the first valid file
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // ── Export Logic ──
  const exportContent = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const latexContent = document ? renderToLatex(document, settings) : "";
  const markdownContent = document ? renderToMarkdown(document, { title: document.title }) : "";

  // ── Render Regions ──
  const renderRegions = (regions: RegionJSON[]) => {
    return (
      <div className="a4-sheet-container py-12 px-4 flex justify-center bg-[#f0f0f2]">
        <div className="a4-sheet bg-white shadow-2xl p-16 min-h-[297mm] w-full max-w-[210mm] text-[#1a1a1a] flex flex-col gap-6">
          {regions.sort((a, b) => a.readingOrder - b.readingOrder).map((region, idx) => {
            const isMath = region.type === "math";
            const isFigure = region.type === "figure";
            const isHeading = region.type === "heading";
            const isList = region.type === "list";
            const text = String(region.content.text || "");
            const latex = String(region.content.latex || "");
            const style = region.style || {};

            if (isFigure) {
              return (
                <div key={region.id} className="figure-block my-4 flex flex-col items-center gap-2">
                  {region.content.snapshot && (
                    <img src={region.content.snapshot} alt="Crop" className="max-w-full h-auto rounded border border-gray-100" />
                  )}
                  {region.diagramDescription && (
                    <p className="text-xs text-center text-gray-500 italic max-w-sm">{region.diagramDescription}</p>
                  )}
                </div>
              );
            }

            if (isMath && latex) {
              return (
                <div key={region.id} className="math-block py-6 flex justify-center bg-gray-50/30 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigator.clipboard.writeText(latex)}>
                  <MathRenderer latex={latex} block />
                </div>
              );
            }

            if (isHeading) {
              const Tag = text.startsWith("##") ? "h2" : "h1";
              return (
                <Tag key={region.id} className={`${Tag === "h1" ? "text-3xl font-serif font-bold tracking-tight border-b pb-4 mb-2" : "text-xl font-serif font-semibold mt-4"}`}>
                  {text.replace(/^#+\s*/, "")}
                </Tag>
              );
            }

            if (isList) {
              const items = text.split("\n").filter(i => i.trim()).map(i => i.replace(/^[-*]|\d+\.\s*/, "").trim());
              return (
                <ul key={region.id} className="list-disc pl-6 flex flex-col gap-2">
                  {items.map((item, i) => (
                    <li key={i} className="text-lg leading-relaxed">{item}</li>
                  ))}
                </ul>
              );
            }

            if (text) {
              return (
                <p key={region.id} className="text-lg leading-relaxed font-serif text-justify" style={{ color: style.color }}>
                  {text}
                </p>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // Main UI
  // ════════════════════════════════════════════════════════════════

  return (
    <div
      className="min-h-screen relative selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
      }}
    >

      {/* ── Background Drop Zone Visual ── */}
      <div className={`upload-area-bg ${isDragging ? "active" : ""}`} />

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto cursor-pointer" onClick={() => window.location.reload()}>
          <span className="text-xl font-black uppercase tracking-tighter">Type It Up</span>
          <span className="text-[10px] bg-[var(--fg)] text-[var(--bg)] px-1.5 py-0.5 font-bold rounded">ALPHA</span>
        </div>

        <button onClick={toggleTheme} className="p-2 rounded-full glass-panel pointer-events-auto">
          {theme === "light" ? Icons.moon : Icons.sun}
        </button>
      </header>

      <main className="relative z-10 w-full">
        {!document ? (
          /* ── Landing Area ── */
          <div className="full-screen-center animate-entrance">
            <h1 className="text-[clamp(2rem,10vw,8rem)] font-black tracking-tighter leading-[0.9] text-center mb-12">
              PAPER TO<br />COMPUTABLE.
            </h1>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full flex items-center justify-center border border-[var(--border)] group-hover:bg-[var(--fg)] group-hover:text-[var(--bg)] transition-all duration-500 mb-6">
                {isProcessing ? <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin" /> : Icons.upload}
              </div>
              <p className="text-sm font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">
                {isProcessing ? "Processing..." : "Drop file or Click to start"}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              className="hidden"
              accept="image/*,application/pdf"
            />

            {error && (
              <div className="mt-12 px-6 py-4 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-lg text-sm font-medium animate-entrance">
                {error}
              </div>
            )}

            <div className="fixed bottom-12 left-0 right-0 flex justify-center opacity-20 hover:opacity-100 transition-opacity">
              <p className="text-xs font-bold uppercase tracking-widest gap-6 flex">
                <span>LaTeX</span>
                <span>Markdown</span>
                <span>PDF</span>
                <span>TikZ</span>
              </p>
            </div>
          </div>
        ) : (
          /* ── Results Area (IDE) ── */
          <div className="flex h-[calc(100vh-64px)] w-full pt-0 overflow-hidden bg-[var(--bg)]">

            {/* ── Sidebar ── */}
            <div className="w-12 sm:w-16 border-r border-[var(--border)] flex flex-col items-center py-4 gap-4 bg-[var(--bg-subtle)]">
              <div className="p-2 bg-[var(--fg)] text-[var(--bg)] rounded-lg">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setIsSourceOpen(!isSourceOpen)}
                className={`p-3 rounded-full transition-all ${isSourceOpen ? "bg-[var(--fg)] text-[var(--bg)]" : "hover:bg-[var(--bg-inset)]"}`}
              >
                {Icons.eye}
              </button>
            </div>

            {/* ── File Tree Mock ── */}
            <div className="hidden lg:flex w-48 border-r border-[var(--border)] flex-col p-4 bg-[var(--bg-inset)]/30">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-40">Files</span>
              <div className="flex items-center gap-2 text-xs font-bold p-2 bg-[var(--fg)]/5 rounded border border-[var(--border)]">
                <span className="text-blue-500">📄</span> main.tex
              </div>
            </div>

            {/* Left Pane: Editor */}
            <div
              style={{ width: `${splitRatio * 100}%` }}
              className="h-full flex flex-col border-r border-[var(--border)] bg-[#1e1e1e] text-[#d4d4d4] transition-[width] duration-0"
            >
              <header className="px-6 py-2 border-b border-[#333] flex justify-between items-center bg-[#252526]">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Source Code</span>
                  <div className="flex items-center gap-2 scale-75 origin-left">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={() => setAutoSync(!autoSync)}
                      className="accent-green-500"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Auto-Compile</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCompile}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[10px] font-bold uppercase tracking-widest transition-colors shadow-lg"
                  >
                    <span>Recompile</span>
                  </button>
                  <div className="w-px h-6 bg-[#333] mx-1" />
                  <button onClick={() => exportContent(editableLatex, "document.tex", "text/x-tex")} className="p-1 hover:bg-[#37373d] rounded">{Icons.download}</button>
                </div>
              </header>
              <textarea
                value={editableLatex}
                onChange={(e) => setEditableLatex(e.target.value)}
                className="flex-1 w-full p-8 font-mono text-[13px] lg:text-[14px] leading-relaxed bg-transparent border-none outline-none resize-none selection:bg-[#264f78]"
                spellCheck={false}
              />
            </div>

            {/* Draggable Divider */}
            <div
              className="w-1.5 h-full cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500 transition-colors z-50 bg-transparent flex items-center justify-center group"
              onMouseDown={startResizing}
            >
              <div className="w-0.5 h-10 bg-gray-400/20 group-hover:bg-blue-400 rounded-full" />
            </div>

            {/* Right Pane: Live Preview */}
            <div className="flex-1 h-full bg-[#f0f0f2] overflow-auto flex flex-col items-center py-12 px-6 custom-scrollbar">
              <div className="a4-sheet bg-white shadow-2xl p-16 min-h-[297mm] w-full max-w-[210mm] text-[#1a1a1a] flex flex-col gap-6 animate-entrance">
                {parseLatexToReact(compiledLatex, document.pages[0].regions.reduce((acc: Record<string, string>, r: RegionJSON) => {
                  if (r.content.snapshot) acc[r.id] = r.content.snapshot;
                  return acc;
                }, {} as Record<string, string>))}
              </div>

              {/* PDF Export Button (Overlay) */}
              <button
                onClick={() => window.print()}
                className="fixed bottom-12 right-12 w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-heavy hover:scale-110 transition-transform z-[100]"
                title="Download PDF"
              >
                {Icons.download}
              </button>

              {/* Status Bar */}
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--bg)] border border-[var(--border)] px-4 py-1.5 rounded-full shadow-medium flex items-center gap-4 z-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status: Succeeded</span>
                </div>
                <div className="w-px h-4 bg-[var(--border)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Page 1 of 1</span>
              </div>
            </div>

            {/* Source Modal */}
            {isSourceOpen && previewUrl && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-12 bg-black/60 backdrop-blur-sm animate-fade-in shadow-heavy">
                <div className="relative max-w-5xl w-full bg-white rounded-3xl p-4 shadow-heavy">
                  <button onClick={() => setIsSourceOpen(false)} className="absolute -top-12 right-0 p-2 text-white hover:scale-110 transition-transform">{Icons.close}</button>
                  <img src={previewUrl} className="w-full h-auto rounded-2xl" alt="Source" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Global Styles Overrides for KaTeX light/dark ── */}
      <style jsx global>{`
        .katex { color: inherit !important; }
        .katex-display { color: inherit !important; }
      `}</style>
    </div>
  );
}
