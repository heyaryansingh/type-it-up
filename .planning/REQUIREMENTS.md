# Requirements: type-it-up

**Defined:** 2026-01-26
**Core Value:** Handwritten notes become compilable LaTeX/Markdown with zero manual transcription

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input & Preprocessing

- [ ] **INPUT-01**: User can upload JPG/PNG images
- [ ] **INPUT-02**: User can upload PDF files (scanned or digital)
- [ ] **INPUT-03**: User can upload multiple pages as a single document/project
- [ ] **INPUT-04**: System auto-crops uploaded images to page boundaries
- [ ] **INPUT-05**: System deskews rotated/tilted pages automatically
- [ ] **INPUT-06**: System enhances contrast for better OCR accuracy

### Layout Analysis

- [ ] **LAYOUT-01**: System detects and classifies regions as text, math, or figure
- [ ] **LAYOUT-02**: System extracts bounding box coordinates for each region
- [ ] **LAYOUT-03**: System assigns confidence score to each detected region
- [ ] **LAYOUT-04**: System handles multi-column layouts correctly
- [ ] **LAYOUT-05**: System detects table regions separately from text

### OCR & Recognition

- [ ] **OCR-01**: System recognizes handwritten text and converts to digital text
- [ ] **OCR-02**: System converts math expressions to valid LaTeX (inline and block)
- [ ] **OCR-03**: System extracts figures/diagrams as cropped PNG images
- [ ] **OCR-04**: System reconstructs correct reading order across all regions
- [ ] **OCR-05**: System provides confidence scores for OCR results

### Output Generation

- [ ] **OUTPUT-01**: System generates LaTeX that compiles without errors
- [ ] **OUTPUT-02**: System generates Markdown with proper math blocks ($...$ and $$...$$)
- [ ] **OUTPUT-03**: System compiles LaTeX to PDF server-side
- [ ] **OUTPUT-04**: System exports Overleaf-ready ZIP with .tex, figures/, and structure
- [ ] **OUTPUT-05**: System embeds figures correctly in both LaTeX and Markdown output
- [ ] **OUTPUT-06**: System escapes special characters properly in LaTeX (%, _, &, etc.)

### Editor & QA

- [ ] **EDITOR-01**: User can preview pages with detected region overlays
- [ ] **EDITOR-02**: User can relabel a region's type (text/math/figure)
- [ ] **EDITOR-03**: User can drag and resize region bounding boxes
- [ ] **EDITOR-04**: User can trigger compile check that pinpoints error regions
- [ ] **EDITOR-05**: Preview updates after user corrections

### AI Suggestions

- [ ] **AI-01**: System flags symbols/variables used without definition
- [ ] **AI-02**: System flags suspicious math (likely OCR errors, impossible expressions)
- [ ] **AI-03**: System suggests clarifications for logic gaps and missing steps
- [ ] **AI-04**: Suggestions appear in separate panel, never modify original content
- [ ] **AI-05**: User can dismiss or accept individual suggestions

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Input

- **INPUT-V2-01**: Support HEIC image format (iOS native)
- **INPUT-V2-02**: Dewarp book curvature automatically
- **INPUT-V2-03**: Split 2-page spreads into individual pages
- **INPUT-V2-04**: Project organization by class/lecture/date

### Enhanced Recognition

- **OCR-V2-01**: Specialized model routing (different model per region type)
- **OCR-V2-02**: Code block detection and syntax highlighting
- **OCR-V2-03**: Title/heading hierarchy detection
- **OCR-V2-04**: Inline editing of OCR text directly in preview
- **OCR-V2-05**: Re-run OCR on single region without full reprocess

### Enhanced Output

- **OUTPUT-V2-01**: Table of contents generation
- **OUTPUT-V2-02**: Advanced LaTeX sanity checking (brace balance, common errors)
- **OUTPUT-V2-03**: Figure vectorization to SVG for line drawings
- **OUTPUT-V2-04**: Chart data extraction and re-plotting

### Enhanced AI

- **AI-V2-01**: Unit mismatch detection in physics equations
- **AI-V2-02**: Notation consistency checking across document
- **AI-V2-03**: Generate "cleaned explanation" appendix

### Platform

- **PLATFORM-V2-01**: iOS mobile app with document scanner
- **PLATFORM-V2-02**: User accounts and project persistence
- **PLATFORM-V2-03**: On-device inference option

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Automatic TikZ diagram generation | Too unreliable; embed as images instead |
| Real-time collaboration | Single-user sufficient for V1 |
| Graph data extraction (plot digitization) | High complexity, low priority |
| User authentication | Guest mode only for V1, simplifies shipping |
| Mobile app | Web-first approach, mobile is V2 |
| On-device inference | Server-side simpler, free CPU inference acceptable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 2 - Input Pipeline | Pending |
| INPUT-02 | Phase 2 - Input Pipeline | Pending |
| INPUT-03 | Phase 2 - Input Pipeline | Pending |
| INPUT-04 | Phase 2 - Input Pipeline | Pending |
| INPUT-05 | Phase 2 - Input Pipeline | Pending |
| INPUT-06 | Phase 2 - Input Pipeline | Pending |
| LAYOUT-01 | Phase 3 - Layout Detection | Pending |
| LAYOUT-02 | Phase 3 - Layout Detection | Pending |
| LAYOUT-03 | Phase 3 - Layout Detection | Pending |
| LAYOUT-04 | Phase 3 - Layout Detection | Pending |
| LAYOUT-05 | Phase 3 - Layout Detection | Pending |
| OCR-01 | Phase 4 - Text Recognition | Pending |
| OCR-02 | Phase 5 - Math Recognition | Pending |
| OCR-03 | Phase 6 - Figure Extraction | Pending |
| OCR-04 | Phase 7 - Reading Order & Assembly | Pending |
| OCR-05 | Phase 4 - Text Recognition | Pending |
| OUTPUT-01 | Phase 8 - Output Rendering | Pending |
| OUTPUT-02 | Phase 8 - Output Rendering | Pending |
| OUTPUT-03 | Phase 9 - Compilation & Export | Pending |
| OUTPUT-04 | Phase 9 - Compilation & Export | Pending |
| OUTPUT-05 | Phase 8 - Output Rendering | Pending |
| OUTPUT-06 | Phase 8 - Output Rendering | Pending |
| EDITOR-01 | Phase 10 - Interactive Editor | Pending |
| EDITOR-02 | Phase 10 - Interactive Editor | Pending |
| EDITOR-03 | Phase 10 - Interactive Editor | Pending |
| EDITOR-04 | Phase 10 - Interactive Editor | Pending |
| EDITOR-05 | Phase 10 - Interactive Editor | Pending |
| AI-01 | Phase 11 - AI Suggestions | Pending |
| AI-02 | Phase 11 - AI Suggestions | Pending |
| AI-03 | Phase 11 - AI Suggestions | Pending |
| AI-04 | Phase 11 - AI Suggestions | Pending |
| AI-05 | Phase 11 - AI Suggestions | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-01-26*
*Last updated: 2026-01-26 after roadmap creation*
