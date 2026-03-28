"use client";

import { useState, useCallback } from "react";
import type { DocumentJSON, RegionJSON, PageJSON } from "@/lib/types";

interface DocumentEditorProps {
  document: DocumentJSON;
  onDocumentChange?: (document: DocumentJSON) => void;
  onExport?: (format: "latex" | "markdown" | "overleaf") => void;
}

const REGION_COLORS = {
  text: "border-blue-500 bg-blue-500/10",
  math: "border-green-500 bg-green-500/10",
  figure: "border-purple-500 bg-purple-500/10",
  table: "border-orange-500 bg-orange-500/10",
  heading: "border-indigo-500 bg-indigo-500/10",
  list: "border-teal-500 bg-teal-500/10",
};

const REGION_LABELS = {
  text: "Text",
  math: "Math",
  figure: "Figure",
  table: "Table",
  heading: "Heading",
  list: "List",
};

export default function DocumentEditor({
  document,
  onDocumentChange,
  onExport,
}: DocumentEditorProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showRegions, setShowRegions] = useState(true);
  const [editingContent, setEditingContent] = useState<string | null>(null);

  const currentPageData = document.pages[currentPage];

  const handleRegionClick = useCallback((regionId: string) => {
    setSelectedRegion(regionId);
    setEditingContent(null);
  }, []);

  const handleRegionTypeChange = useCallback(
    (regionId: string, newType: RegionJSON["type"]) => {
      if (!onDocumentChange) return;

      const newDocument = { ...document };
      const page = newDocument.pages[currentPage];
      const regionIndex = page.regions.findIndex((r) => r.id === regionId);

      if (regionIndex !== -1) {
        page.regions[regionIndex] = {
          ...page.regions[regionIndex],
          type: newType,
        };
        onDocumentChange(newDocument);
      }
    },
    [document, currentPage, onDocumentChange]
  );

  const handleContentEdit = useCallback(
    (regionId: string, content: string) => {
      if (!onDocumentChange) return;

      const newDocument = { ...document };
      const page = newDocument.pages[currentPage];
      const regionIndex = page.regions.findIndex((r) => r.id === regionId);

      if (regionIndex !== -1) {
        const region = page.regions[regionIndex];
        if (region.type === "math") {
          region.content = { ...region.content, latex: content };
        } else {
          region.content = { ...region.content, text: content };
        }
        onDocumentChange(newDocument);
      }
      setEditingContent(null);
    },
    [document, currentPage, onDocumentChange]
  );

  const selectedRegionData = currentPageData?.regions.find(
    (r) => r.id === selectedRegion
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-4">
          {/* Page navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage + 1} of {document.pages.length}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(document.pages.length - 1, p + 1))
              }
              disabled={currentPage === document.pages.length - 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Toggle regions */}
          <button
            onClick={() => setShowRegions((s) => !s)}
            className={`px-3 py-1.5 text-sm rounded ${
              showRegions
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {showRegions ? "Hide" : "Show"} Regions
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onExport?.("latex")}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Export LaTeX
          </button>
          <button
            onClick={() => onExport?.("markdown")}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Export Markdown
          </button>
          <button
            onClick={() => onExport?.("overleaf")}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Overleaf ZIP
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Preview area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-950 shadow-lg rounded-lg p-8 relative min-h-[600px]">
            {/* Regions */}
            {showRegions &&
              currentPageData?.regions
                .filter((region) => region.bbox)
                .map((region) => {
                  const bbox = region.bbox;
                  if (!bbox) return null;

                  return (
                    <div
                      key={region.id}
                      onClick={() => handleRegionClick(region.id)}
                      style={{
                        position: "absolute",
                        left: `${bbox.x}%`,
                        top: `${bbox.y}%`,
                        width: `${bbox.width}%`,
                        height: `${bbox.height}%`,
                      }}
                      className={`
                        border-2 rounded cursor-pointer transition-all
                        ${REGION_COLORS[region.type]}
                        ${
                          selectedRegion === region.id
                            ? "ring-2 ring-offset-2 ring-blue-500"
                            : ""
                        }
                      `}
                    >
                      {/* Region label */}
                      <span className="absolute -top-6 left-0 text-xs font-medium px-1.5 py-0.5 rounded bg-gray-800 text-white">
                        {REGION_LABELS[region.type]} ({Math.round(region.confidence * 100)}%)
                      </span>

                      {/* Content preview */}
                      <div className="p-2 text-sm overflow-hidden">
                        {region.type === "math" ? (
                          <code className="text-xs text-green-600 dark:text-green-400">
                            {region.content.latex?.substring(0, 50)}...
                          </code>
                        ) : region.type === "figure" ? (
                          <span className="text-purple-600 dark:text-purple-400">
                            [Figure]
                          </span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">
                            {region.content.text?.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

            {/* Empty state */}
            {(!currentPageData?.regions ||
              currentPageData.regions.length === 0) && (
              <div className="flex items-center justify-center h-full text-gray-400">
                No regions detected
              </div>
            )}
          </div>
        </div>

        {/* Properties panel */}
        {selectedRegion && selectedRegionData && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-800 p-4 overflow-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Region Properties
            </h3>

            {/* Type selector */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Type
              </label>
              <select
                value={selectedRegionData.type}
                onChange={(e) =>
                  handleRegionTypeChange(
                    selectedRegion,
                    e.target.value as RegionJSON["type"]
                  )
                }
                className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900"
              >
                <option value="text">Text</option>
                <option value="math">Math</option>
                <option value="figure">Figure</option>
                <option value="table">Table</option>
              </select>
            </div>

            {/* Confidence */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Confidence
              </label>
              <div className="flex items-center">
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded">
                  <div
                    className="h-full bg-green-500 rounded"
                    style={{ width: `${selectedRegionData.confidence * 100}%` }}
                  />
                </div>
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {Math.round(selectedRegionData.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Content editor */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Content
              </label>
              {editingContent === selectedRegion ? (
                <div>
                  <textarea
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 font-mono text-sm"
                    rows={6}
                    defaultValue={
                      selectedRegionData.type === "math"
                        ? selectedRegionData.content.latex
                        : selectedRegionData.content.text
                    }
                    onBlur={(e) =>
                      handleContentEdit(selectedRegion, e.target.value)
                    }
                  />
                  <button
                    onClick={() => setEditingContent(null)}
                    className="mt-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setEditingContent(selectedRegion)}
                  className="p-2 bg-gray-50 dark:bg-gray-900 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {selectedRegionData.type === "math"
                      ? selectedRegionData.content.latex
                      : selectedRegionData.type === "figure"
                        ? selectedRegionData.content.imagePath
                        : selectedRegionData.content.text}
                  </pre>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    Click to edit
                  </span>
                </div>
              )}
            </div>

            {/* Bounding box */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                Bounding Box
              </label>
              {selectedRegionData.bbox ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>X: {selectedRegionData.bbox.x.toFixed(1)}%</div>
                  <div>Y: {selectedRegionData.bbox.y.toFixed(1)}%</div>
                  <div>W: {selectedRegionData.bbox.width.toFixed(1)}%</div>
                  <div>H: {selectedRegionData.bbox.height.toFixed(1)}%</div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No bounding box data available for this region.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
