"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import DocumentEditor from "@/components/DocumentEditor";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import type { DocumentJSON } from "@/lib/types";
import type { Suggestion } from "@/lib/ai-suggestions";

type AppState = "upload" | "processing" | "editing";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [uploadResult, setUploadResult] = useState<{
    projectId: string;
    pages: { id: string; pageNumber: number; originalPath: string }[];
  } | null>(null);
  const [document, setDocument] = useState<DocumentJSON | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");

  const handleUploadComplete = (result: {
    projectId: string;
    pages: { id: string; pageNumber: number; originalPath: string }[];
  }) => {
    setUploadResult(result);
    setError(null);
  };

  const handleProcess = async () => {
    if (!uploadResult) return;

    setAppState("processing");
    setProcessingStatus("Processing document...");

    try {
      // Process the first page (can extend to multiple pages)
      const firstPage = uploadResult.pages[0];
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: uploadResult.projectId,
          pageId: firstPage.id,
          originalPath: firstPage.originalPath,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      setDocument(result.document);
      setProcessingStatus("Analyzing for suggestions...");

      // Run AI analysis
      try {
        const analyzeResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document: result.document,
            // groqApiKey can be added from env or user input
          }),
        });

        const analyzeResult = await analyzeResponse.json();
        if (analyzeResult.success) {
          setSuggestions(analyzeResult.suggestions || []);
        }
      } catch {
        // Analysis is optional, continue without suggestions
        console.warn("AI analysis unavailable");
      }

      setAppState("editing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setAppState("upload");
    }
  };

  const handleExport = async (format: "latex" | "markdown" | "overleaf") => {
    if (!document) return;

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document,
          format,
          title: document.title || "document",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get the blob and download it
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;

      if (format === "latex") {
        a.download = `${document.title || "document"}.tex`;
      } else if (format === "markdown") {
        a.download = `${document.title || "document"}.md`;
      } else {
        a.download = `${document.title || "document"}-overleaf.zip`;
      }

      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleJumpToRegion = (regionId: string, pageNumber: number) => {
    // Could implement page navigation and region highlighting here
    console.log("Jump to region:", regionId, "on page:", pageNumber);
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleReset = () => {
    setAppState("upload");
    setUploadResult(null);
    setDocument(null);
    setSuggestions([]);
    setError(null);
  };

  // Processing state
  if (appState === "processing") {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {processingStatus}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This may take 30-60 seconds per page
          </p>
        </div>
      </main>
    );
  }

  // Editing state
  if (appState === "editing" && document) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
        {/* Header */}
        <header className="border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={handleReset}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              type-it-up
            </h1>
            <div className="w-20" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className="flex-1">
            <DocumentEditor
              document={document}
              onDocumentChange={setDocument}
              onExport={handleExport}
            />
          </div>

          {/* Suggestions sidebar */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
            <SuggestionsPanel
              suggestions={suggestions}
              onDismiss={handleDismissSuggestion}
              onJumpToRegion={handleJumpToRegion}
            />
          </div>
        </div>
      </main>
    );
  }

  // Upload state (default)
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            type-it-up
          </h1>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {!uploadResult ? (
          <>
            {/* Hero */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Handwritten notes to LaTeX
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Transform photos and PDFs of handwritten lecture notes into clean,
                professional LaTeX and Markdown that compiles without errors.
              </p>
            </div>

            {/* Upload */}
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={(err) => setError(err)}
            />

            {/* Error display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Features */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Math Recognition
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Equations, integrals, and formulas converted to valid LaTeX
                </p>
              </div>

              <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Figure Extraction
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Diagrams and figures extracted and embedded in your document
                </p>
              </div>

              <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-4">
                  <svg
                    className="w-5 h-5 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  AI Suggestions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Smart suggestions to improve clarity and catch errors
                </p>
              </div>
            </div>
          </>
        ) : (
          /* Upload complete - show result */
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Upload Complete
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {uploadResult.pages.length} page
              {uploadResult.pages.length > 1 ? "s" : ""} uploaded successfully
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                Project ID: {uploadResult.projectId}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="space-x-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Upload More
              </button>
              <button
                onClick={handleProcess}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Process Notes
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
