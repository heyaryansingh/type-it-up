export type RegionType =
  | "title"
  | "paragraph"
  | "math_inline"
  | "math_block"
  | "figure"
  | "table"
  | "code"
  | "header"
  | "footer"
  | "list"
  | "caption"
  | "unknown";

export type BoundingBox = [number, number, number, number];

export interface OcrRegion {
  id: string;
  pageIndex: number;
  type: RegionType;
  bbox: BoundingBox;
  confidence?: number;
  order?: number;
  text?: string;
  latex?: string;
  assetPath?: string;
  attributes?: Record<string, string | number | boolean | null>;
}

export interface OcrPage {
  index: number;
  width: number;
  height: number;
  rotation?: number;
  regions: OcrRegion[];
}

export interface OcrDocumentSource {
  kind: "pdf" | "image";
  fileName?: string;
  pageCount: number;
}

export interface OcrDocument {
  id: string;
  version: "0.1";
  createdAt: string;
  source: OcrDocumentSource;
  pages: OcrPage[];
  languages?: string[];
}
