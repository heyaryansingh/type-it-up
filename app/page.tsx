"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";

export default function Home() {
  const [uploadResult, setUploadResult] = useState<{
    projectId: string;
    pages: { id: string; pageNumber: number }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
              onUploadComplete={(result) => {
                setUploadResult(result);
                setError(null);
              }}
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

            <div className="space-x-4">
              <button
                onClick={() => setUploadResult(null)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Upload More
              </button>
              <button
                onClick={() => {
                  // TODO: Navigate to processing view
                  alert("Processing view coming in Phase 3+");
                }}
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
