# Type-It-Up

Type-It-Up converts handwritten notes, mathematical expressions, and technical diagrams into structured outputs that are easier to reuse and publish.

## MVP

- image upload and processing flow
- OCR and math extraction
- LaTeX and Markdown generation
- diagram-to-TikZ support
- export paths for PDF and Overleaf-style packaging
- Next.js app with production build working in the current workspace

## Why It Exists

The project is aimed at turning rough notes into clean technical documents without forcing manual retyping of formulas, notation, and diagrams.

## Stack

- Next.js
- React
- KaTeX
- Groq-based vision processing
- client-side export helpers for PDF and archive generation

## Local Development

```bash
npm.cmd run dev
```

## Production Build

```bash
npm.cmd run build
```

## Validation

```bash
npm.cmd run lint
```

The current lint path is scoped to the application code and exits without errors in this workspace.
