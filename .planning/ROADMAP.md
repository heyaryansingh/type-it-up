# Roadmap: type-it-up

## Overview

This roadmap transforms handwritten lecture notes into compilable LaTeX/Markdown through 11 phases. We build the processing pipeline vertically: input → layout → OCR (text, math, figures) → assembly → output → editor → AI. Each phase delivers a complete, verifiable capability that enables the next phase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, deployment pipeline, and infrastructure
- [ ] **Phase 2: Input Pipeline** - Upload and preprocess images/PDFs
- [ ] **Phase 3: Layout Detection** - Detect and classify page regions
- [ ] **Phase 4: Text Recognition** - OCR handwritten text with confidence scores
- [ ] **Phase 5: Math Recognition** - Convert math expressions to LaTeX
- [ ] **Phase 6: Figure Extraction** - Extract diagrams as images
- [ ] **Phase 7: Reading Order & Assembly** - Reconstruct reading order and create canonical JSON
- [ ] **Phase 8: Output Rendering** - Generate LaTeX and Markdown from JSON
- [ ] **Phase 9: Compilation & Export** - Compile PDF and create Overleaf packages
- [ ] **Phase 10: Interactive Editor** - Preview and correction tools
- [ ] **Phase 11: AI Suggestions** - Smart suggestions and error detection

## Phase Details

### Phase 1: Foundation
**Goal**: Project infrastructure is deployed and ready to accept work
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure phase)
**Success Criteria** (what must be TRUE):
  1. Next.js app deploys to Vercel and loads successfully
  2. Supabase database is connected and accessible from serverless functions
  3. Storage backend (R2 or Supabase Storage) accepts file uploads
  4. Hugging Face Spaces endpoint responds to health checks
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Initialize Next.js with TypeScript and configure Supabase connection
- [ ] 01-02-PLAN.md — Set up storage backend (R2 or Supabase Storage) with upload/retrieve operations
- [ ] 01-03-PLAN.md — Deploy Hugging Face Space with OCR model and health endpoint
- [ ] 01-04-PLAN.md — Deploy to Vercel and verify full stack integration

### Phase 2: Input Pipeline
**Goal**: Users can upload images/PDFs and system preprocesses them for OCR
**Depends on**: Phase 1
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, INPUT-06
**Success Criteria** (what must be TRUE):
  1. User can upload JPG/PNG images via drag-and-drop or file picker
  2. User can upload multi-page PDF files
  3. User can upload multiple pages as a single project/session
  4. Uploaded pages are auto-cropped to remove margins and background
  5. Tilted/rotated pages are automatically deskewed
  6. Low-contrast handwriting is enhanced for better readability
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 3: Layout Detection
**Goal**: System identifies what's on the page (text vs math vs figure regions)
**Depends on**: Phase 2
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05
**Success Criteria** (what must be TRUE):
  1. System detects regions and labels them as text, math, or figure
  2. Each region has bounding box coordinates (x, y, width, height)
  3. Each region has a confidence score indicating detection certainty
  4. Multi-column layouts are handled correctly (regions don't merge across columns)
  5. Table regions are detected separately from regular text
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 4: Text Recognition
**Goal**: Handwritten text becomes digital text with confidence scores
**Depends on**: Phase 3
**Requirements**: OCR-01, OCR-05
**Success Criteria** (what must be TRUE):
  1. Handwritten text regions are converted to digital text
  2. Each recognized text segment has a confidence score
  3. Low-confidence text is visually flagged in output
  4. Text recognition works across different handwriting styles
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 5: Math Recognition
**Goal**: Handwritten math expressions become valid LaTeX
**Depends on**: Phase 4
**Requirements**: OCR-02
**Success Criteria** (what must be TRUE):
  1. Inline math expressions convert to LaTeX with $...$ delimiters
  2. Block equations convert to LaTeX with $$...$$ delimiters
  3. Common math symbols (integrals, summations, fractions) are recognized
  4. Superscripts, subscripts, and nested expressions render correctly
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 6: Figure Extraction
**Goal**: Diagrams and figures are extracted as standalone images
**Depends on**: Phase 5
**Requirements**: OCR-03
**Success Criteria** (what must be TRUE):
  1. Figure regions are cropped and saved as PNG images
  2. Extracted figures maintain original aspect ratio and clarity
  3. White backgrounds are preserved (no unwanted cropping of figure content)
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 7: Reading Order & Assembly
**Goal**: All regions are assembled in correct reading order with canonical JSON representation
**Depends on**: Phase 6
**Requirements**: OCR-04
**Success Criteria** (what must be TRUE):
  1. Regions appear in logical reading order (top-to-bottom, left-to-right, respecting columns)
  2. JSON structure contains pages array with regions array per page
  3. Each region has type, bbox, text/latex/image_path, and confidence
  4. Multi-page documents maintain page boundaries in JSON
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 8: Output Rendering
**Goal**: Canonical JSON becomes compilable LaTeX and valid Markdown
**Depends on**: Phase 7
**Requirements**: OUTPUT-01, OUTPUT-02, OUTPUT-05, OUTPUT-06
**Success Criteria** (what must be TRUE):
  1. LaTeX output compiles without errors (pdflatex succeeds)
  2. Markdown output renders correctly with math blocks
  3. Figures are embedded correctly in both LaTeX and Markdown
  4. Special characters (%, _, &, #) are properly escaped in LaTeX
  5. Math expressions use correct delimiters in Markdown ($...$ and $$...$$)
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 9: Compilation & Export
**Goal**: Users can download PDF and Overleaf-ready packages
**Depends on**: Phase 8
**Requirements**: OUTPUT-03, OUTPUT-04
**Success Criteria** (what must be TRUE):
  1. LaTeX compiles to PDF server-side using pdflatex
  2. Compiled PDF is available for immediate download
  3. Overleaf ZIP contains .tex file, figures/ directory, and proper structure
  4. Overleaf ZIP can be imported directly to Overleaf without errors
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 10: Interactive Editor
**Goal**: Users can preview results and correct errors before export
**Depends on**: Phase 9
**Requirements**: EDITOR-01, EDITOR-02, EDITOR-03, EDITOR-04, EDITOR-05
**Success Criteria** (what must be TRUE):
  1. User sees page preview with color-coded region overlays (text=blue, math=green, figure=red)
  2. User can click a region and change its type (text/math/figure)
  3. User can drag region corners to resize bounding boxes
  4. User can trigger compile check that highlights error regions
  5. Preview updates immediately after user makes corrections
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

### Phase 11: AI Suggestions
**Goal**: AI flags potential errors and suggests improvements without modifying content
**Depends on**: Phase 10
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. System flags variables/symbols used without prior definition
  2. System flags suspicious math (impossible expressions, likely OCR errors)
  3. System suggests clarifications for logic gaps and missing steps
  4. Suggestions appear in separate panel (never modify original content)
  5. User can dismiss or accept individual suggestions one-by-one
**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/4 | Not started | - |
| 2. Input Pipeline | 0/TBD | Not started | - |
| 3. Layout Detection | 0/TBD | Not started | - |
| 4. Text Recognition | 0/TBD | Not started | - |
| 5. Math Recognition | 0/TBD | Not started | - |
| 6. Figure Extraction | 0/TBD | Not started | - |
| 7. Reading Order & Assembly | 0/TBD | Not started | - |
| 8. Output Rendering | 0/TBD | Not started | - |
| 9. Compilation & Export | 0/TBD | Not started | - |
| 10. Interactive Editor | 0/TBD | Not started | - |
| 11. AI Suggestions | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-26*
*Last updated: 2026-01-26*
