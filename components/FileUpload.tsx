"use client";

import { useState, useCallback, useRef } from "react";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}

interface FileUploadProps {
  onUploadComplete?: (result: {
    projectId: string;
    pages: { id: string; pageNumber: number }[];
  }) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export default function FileUpload({
  onUploadComplete,
  onError,
  maxFiles = 20,
  maxSizeMB = 50,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];

      if (!allowedTypes.includes(file.type)) {
        return `${file.name}: Unsupported file type. Use JPG, PNG, or PDF.`;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        return `${file.name}: File too large. Max ${maxSizeMB}MB.`;
      }

      return null;
    },
    [maxSizeMB]
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);

      if (files.length + fileArray.length > maxFiles) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles: UploadedFile[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          onError?.(error);
          continue;
        }

        validFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          status: "pending",
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [files.length, maxFiles, validateFile, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    // Get the actual File objects from the input
    const fileInput = fileInputRef.current;
    if (!fileInput?.files) {
      onError?.("No files selected");
      setIsUploading(false);
      return;
    }

    const formData = new FormData();
    Array.from(fileInput.files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const }))
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setFiles((prev) => prev.map((f) => ({ ...f, status: "done" as const })));

      onUploadComplete?.({
        projectId: result.projectId,
        pages: result.pages,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Upload failed";
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "error" as const, error: errorMsg }))
      );
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Drop your notes here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or click to browse
            </p>
          </div>

          <p className="text-xs text-gray-400">
            JPG, PNG, or PDF • Up to {maxSizeMB}MB each • Max {maxFiles} files
          </p>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium
                  ${
                    file.type === "application/pdf"
                      ? "bg-red-100 text-red-600"
                      : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {file.type === "application/pdf" ? "PDF" : "IMG"}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {file.status === "uploading" && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
                {file.status === "done" && (
                  <svg
                    className="w-5 h-5 text-green-500"
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
                )}
                {file.status === "error" && (
                  <span className="text-xs text-red-500">{file.error}</span>
                )}
                {file.status === "pending" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && files.some((f) => f.status === "pending") && (
        <button
          onClick={uploadFiles}
          disabled={isUploading}
          className={`
            mt-6 w-full py-3 px-4 rounded-lg font-medium text-white
            transition-all duration-200
            ${
              isUploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }
          `}
        >
          {isUploading ? "Uploading..." : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
