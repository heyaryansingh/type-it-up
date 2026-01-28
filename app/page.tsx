"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { DocumentJSON, RegionJSON } from "@/lib/types";
import katex from "katex";
import "katex/dist/katex.min.css";

// ============================================================================
// Types
// ============================================================================
type ViewMode = "preview" | "latex" | "raw";

// ============================================================================
// Icons (inline SVGs for cleaner imports)
// ============================================================================
const Icons = {
  upload: (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  document: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  copy: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  ),
  check: (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  spinner: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="animate-spin">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0l-2.121-2.121M8.757 8.757L6.636 6.636" />
    </svg>
  ),
  image: (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
};

// ============================================================================
// Components
// ============================================================================

// Toast notification
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg shadow-lg text-sm font-medium">
        <span className="text-[var(--success)]">{Icons.check}</span>
        {message}
      </div>
    </div>
  );
}

// LaTeX renderer using KaTeX
function MathRenderer({ latex, block = false }: { latex: string; block?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current && latex) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: block,
          trust: true,
        });
      } catch {
        if (ref.current) ref.current.textContent = latex;
      }
    }
  }, [latex, block]);

  return <span ref={ref} />;
}

// Upload zone component
function UploadZone({
  onFile,
  isProcessing,
}: {
  onFile: (file: File) => void;
  isProcessing: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null | undefined) => {
    if (file && file.type.startsWith("image/")) {
      onFile(file);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !isProcessing && inputRef.current?.click()}
      className={`
        relative cursor-pointer select-none
        border-2 border-dashed rounded-xl p-8
        flex flex-col items-center justify-center gap-4
        transition-all duration-200
        ${isDragging
          ? "border-[var(--accent)] bg-[var(--accent-light)]"
          : "border-[var(--border)] hover:border-[var(--muted)] bg-[var(--card)]"
        }
        ${isProcessing ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={isProcessing}
      />

      {isProcessing ? (
        <>
          <div className="text-[var(--accent)]">{Icons.spinner}</div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">Processing...</p>
            <p className="text-xs text-[var(--muted)] mt-1">Analyzing your document</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)]">
            {Icons.upload}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {isDragging ? "Drop to upload" : "Upload image"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Drag & drop or click to browse
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <kbd className="px-1.5 py-0.5 bg-[var(--card-hover)] border border-[var(--border)] rounded text-[10px] font-mono">
              Ctrl+V
            </kbd>
            <span>to paste</span>
          </div>
        </>
      )}
    </div>
  );
}

// Document region renderer
function DocumentRegion({ region, onCopy }: { region: RegionJSON; onCopy: (t: string) => void }) {
  const isMath = region.type === "math";
  const isFigure = region.type === "figure";
  const hasImage = region.content.imagePath;
  const text = region.content.text || "";
  const latex = region.content.latex || "";

  // Figure with image
  if (isFigure && hasImage) {
    const caption = text.split("\n")[0]?.replace(/^\[.*?\]\s*/, "") || "Figure";
    return (
      <div className="figure-region">
        <img src={hasImage} alt={caption} />
        <p className="figure-caption">{caption}</p>
      </div>
    );
  }

  // Math equation
  if (isMath && latex) {
    return (
      <div
        className="math-region group cursor-pointer hover:bg-[var(--accent-light)] transition-colors"
        onClick={() => onCopy(latex)}
        title="Click to copy LaTeX"
      >
        <MathRenderer latex={latex} block />
      </div>
    );
  }

  // Text content
  if (text) {
    // Heading
    if (text.startsWith("# ")) {
      return <h2>{text.slice(2)}</h2>;
    }
    // Regular paragraph
    return <p>{text}</p>;
  }

  return null;
}

// Preview panel
function PreviewPanel({
  document,
  onCopy,
  previewRef,
}: {
  document: DocumentJSON;
  onCopy: (t: string) => void;
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={previewRef} className="doc-content p-6 min-h-[300px] bg-white dark:bg-[var(--card)]">
      {document.title && <h1>{document.title}</h1>}
      {document.pages[0]?.regions.map((region) => (
        <DocumentRegion key={region.id} region={region} onCopy={onCopy} />
      ))}
    </div>
  );
}

// LaTeX code panel
function LatexPanel({ latex, onCopy }: { latex: string; onCopy: () => void }) {
  return (
    <div className="relative">
      <button
        onClick={onCopy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--card-hover)] rounded border border-[var(--border)] transition-colors"
      >
        {Icons.copy}
        Copy
      </button>
      <pre className="p-4 pt-12 text-sm font-mono text-[var(--foreground)] bg-[var(--card-hover)] overflow-x-auto min-h-[300px] whitespace-pre-wrap leading-relaxed">
        {latex}
      </pre>
    </div>
  );
}

// Raw regions panel
function RawPanel({
  regions,
  onCopy,
}: {
  regions: RegionJSON[];
  onCopy: (t: string) => void;
}) {
  return (
    <div className="p-4 space-y-3 min-h-[300px]">
      {regions.map((region) => {
        const content = region.type === "math" ? region.content.latex : region.content.text;
        return (
          <div
            key={region.id}
            className="p-3 bg-[var(--card-hover)] border border-[var(--border)] rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                  region.type === "math"
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                    : region.type === "figure"
                    ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                }`}
              >
                {region.type}
              </span>
              <span className="text-[10px] text-[var(--muted)]">
                {Math.round(region.confidence * 100)}%
              </span>
              <button
                onClick={() => onCopy(content || "")}
                className="ml-auto text-[10px] text-[var(--accent)] hover:underline"
              >
                Copy
              </button>
            </div>
            <code className="text-xs text-[var(--muted-foreground)] break-all block">
              {content}
            </code>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export default function Home() {
  const [document, setDocument] = useState<DocumentJSON | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [toast, setToast] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Process uploaded file
  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", crypto.randomUUID());

      const res = await fetch("/api/process", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || "Processing failed");

      setDocument(data.document);
      setToast("Document processed successfully");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Processing failed");
      setPreviewUrl(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Clipboard paste handler
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [isProcessing, processFile]);

  // Generate LaTeX
  const generateLatex = useCallback(() => {
    if (!document) return "";
    let tex = "\\documentclass{article}\n\\usepackage{amsmath,amssymb,graphicx}\n\\begin{document}\n\n";
    if (document.title) tex += `\\title{${document.title}}\n\\maketitle\n\n`;
    for (const page of document.pages) {
      for (const r of page.regions) {
        if (r.type === "math" && r.content.latex) {
          tex += `\\begin{equation}\n${r.content.latex}\n\\end{equation}\n\n`;
        } else if (r.type === "figure") {
          tex += `% Figure: ${r.content.text?.split("\\n")[0] || "Image"}\n% \\includegraphics{figure}\n\n`;
        } else if (r.content.text) {
          const t = r.content.text;
          if (t.startsWith("# ")) tex += `\\section{${t.slice(2)}}\n\n`;
          else tex += `${t}\n\n`;
        }
      }
    }
    tex += "\\end{document}";
    return tex;
  }, [document]);

  // Copy to clipboard
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setToast("Copied to clipboard");
  };

  // Export PDF
  const exportPdf = async () => {
    if (!previewRef.current || !document) return;
    setToast("Generating PDF...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${document.title || "document"}.pdf`);
      setToast("PDF downloaded");
    } catch {
      setToast("PDF export failed");
    }
  };

  // Export LaTeX
  const exportLatex = () => {
    const tex = generateLatex();
    const blob = new Blob([tex], { type: "text/x-latex" });
    const a = window.document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${document?.title || "document"}.tex`;
    a.click();
    setToast("LaTeX file downloaded");
  };

  // Reset
  const reset = () => {
    setDocument(null);
    setPreviewUrl(null);
    setViewMode("preview");
  };

  const regions = document?.pages[0]?.regions || [];
  const textCount = regions.filter((r) => r.type === "text").length;
  const mathCount = regions.filter((r) => r.type === "math").length;
  const figureCount = regions.filter((r) => r.type === "figure").length;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)]">{Icons.document}</span>
            <span className="font-semibold text-[var(--foreground)]">type-it-up</span>
          </div>

          {document && (
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                New
              </button>
              <button
                onClick={exportLatex}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-colors"
              >
                {Icons.download}
                <span>.tex</span>
              </button>
              <button
                onClick={exportPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
              >
                {Icons.download}
                <span>PDF</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {!document ? (
          // Upload view
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
                Convert handwritten notes
              </h1>
              <p className="text-sm text-[var(--muted)]">
                Upload an image to extract text, math, and diagrams
              </p>
            </div>

            <UploadZone onFile={processFile} isProcessing={isProcessing} />

            {previewUrl && isProcessing && (
              <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl">
                <img src={previewUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Text", desc: "Handwriting OCR" },
                { label: "Math", desc: "LaTeX equations" },
                { label: "Diagrams", desc: "Figures & graphs" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg text-center"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{f.label}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Result view
          <div className="grid lg:grid-cols-5 gap-6 animate-fade-in">
            {/* Source image */}
            <div className="lg:col-span-2">
              <div className="sticky top-20">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">Source</span>
                    <button
                      onClick={reset}
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                  {previewUrl && (
                    <div className="p-4">
                      <img src={previewUrl} alt="Source" className="w-full rounded-lg" />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { n: textCount, label: "Text" },
                    { n: mathCount, label: "Math" },
                    { n: figureCount, label: "Figures" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="p-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-center"
                    >
                      <p className="text-lg font-semibold text-[var(--foreground)]">{s.n}</p>
                      <p className="text-[10px] text-[var(--muted)]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Output */}
            <div className="lg:col-span-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-[var(--border)]">
                  {(["preview", "latex", "raw"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setViewMode(m)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        viewMode === m
                          ? "text-[var(--accent)] border-b-2 border-[var(--accent)] -mb-px"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Content */}
                {viewMode === "preview" && (
                  <PreviewPanel document={document} onCopy={copy} previewRef={previewRef} />
                )}
                {viewMode === "latex" && (
                  <LatexPanel latex={generateLatex()} onCopy={() => copy(generateLatex())} />
                )}
                {viewMode === "raw" && <RawPanel regions={regions} onCopy={copy} />}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
