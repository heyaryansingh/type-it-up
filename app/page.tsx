"use client";

import { useState, useRef } from "react";
import type { DocumentJSON } from "@/lib/types";

type AppState = "upload" | "processing" | "result";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("upload");
  const [document, setDocument] = useState<DocumentJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Start processing
    setAppState("processing");
    setProcessingStatus("Analyzing your handwritten notes...");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", crypto.randomUUID());

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      setDocument(result.document);
      setAppState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setAppState("upload");
    }
  };

  const handleExport = async (format: "latex" | "markdown") => {
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
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.title || "document"}.${format === "latex" ? "tex" : "md"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleReset = () => {
    setAppState("upload");
    setDocument(null);
    setError(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Processing state
  if (appState === "processing") {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {processingStatus}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Using AI to recognize text and math...
          </p>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="mt-6 max-w-full max-h-48 mx-auto rounded-lg shadow-lg"
            />
          )}
        </div>
      </main>
    );
  }

  // Result state
  if (appState === "result" && document) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New Upload
            </button>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">type-it-up</h1>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("latex")}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Export LaTeX
              </button>
              <button
                onClick={() => handleExport("markdown")}
                className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Export Markdown
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Original Image */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Original</h3>
              {previewUrl && (
                <img src={previewUrl} alt="Original" className="w-full rounded border border-gray-200 dark:border-gray-700" />
              )}
            </div>

            {/* Extracted Content */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Extracted Content</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {document.pages[0]?.regions.map((region, idx) => (
                  <div
                    key={region.id}
                    className={`p-3 rounded-lg ${
                      region.type === "math"
                        ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                        : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          region.type === "math"
                            ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {region.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(region.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className={`text-sm ${region.type === "math" ? "font-mono" : ""}`}>
                      {region.type === "math" ? (
                        <code className="text-green-700 dark:text-green-300 break-all">
                          {region.content.latex}
                        </code>
                      ) : (
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {region.content.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Upload state (default)
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">type-it-up</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Handwritten Notes → LaTeX
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Upload a photo of your notes and get clean, compilable LaTeX
            </p>
          </div>

          {/* Upload area */}
          <label className="block">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-900 dark:text-white font-medium mb-1">
                Click to upload an image
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG, or WEBP
              </p>
            </div>
          </label>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="p-3">
              <div className="text-2xl mb-1">📝</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Text Recognition</p>
            </div>
            <div className="p-3">
              <div className="text-2xl mb-1">📐</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Math to LaTeX</p>
            </div>
            <div className="p-3">
              <div className="text-2xl mb-1">✨</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">AI Powered</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
