# type-it-up

## What This Is

A web application that transforms photos and PDFs of handwritten lecture notes (text, math, diagrams) into clean, professional LaTeX and Markdown that compiles without errors and exports to PDF or Overleaf-ready packages. The core promise: "Take pictures of your notes. Get publishable notes."

## Core Value

**Handwritten notes become compilable LaTeX/Markdown with zero manual transcription.** If this doesn't work reliably, nothing else matters.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Image/PDF upload (single and multi-page)
- [ ] Page preprocessing (auto-crop, deskew, contrast enhancement)
- [ ] Layout segmentation (text vs math vs figure regions)
- [ ] Handwritten text OCR with confidence scores
- [ ] Math OCR → LaTeX for equations (inline and block)
- [ ] Figure extraction as embedded images
- [ ] Reading order reconstruction
- [ ] LaTeX output that compiles cleanly
- [ ] Markdown output with math blocks
- [ ] Preview UI showing detected regions
- [ ] Basic region correction tools (relabel, adjust bounds)
- [ ] Export: .tex, .md, PDF, Overleaf-ready ZIP
- [ ] AI Suggestions: flag undefined symbols, suspicious math, logic gaps

### Out of Scope

- Mobile iOS app — V2, web-first for V1
- Automatic TikZ diagram generation — too unreliable, embed as images instead
- Graph data extraction (plot digitization) — V2 feature
- On-device inference — server-side for V1
- Real-time collaboration — single-user for V1
- User accounts/auth — guest mode only for V1

## Context

**Target users:** Students (STEM and non-STEM), teachers/TAs, researchers — anyone with handwritten content to digitize.

**Technical approach:** Document pipeline architecture with tight contracts:
1. Detect layout → classify regions
2. OCR each region with appropriate model
3. Reconstruct reading order
4. Render to LaTeX/Markdown
5. Compile and verify
6. Run AI suggestions

**Key architectural decision:** Use a canonical intermediate JSON representation (pages → regions → type/bbox/text/confidence). LaTeX and Markdown are render targets from this JSON.

**Model strategy:** Start with a single strong end-to-end model (Marker or Pix2Text) deployed to Hugging Face Spaces (CPU). Add specialized models (TrOCR, Texify, pix2tex) in V2 for higher accuracy.

**Infrastructure:** Completely free tier stack:
- Frontend: Vercel (Next.js)
- Backend: Vercel Serverless Functions
- Database: Supabase (Postgres)
- Storage: Cloudflare R2 or Supabase Storage
- ML Inference: Hugging Face Spaces (CPU) — accepts ~30-60s per page latency
- AI Suggestions: Groq API free tier (Llama)

## Constraints

- **Cost**: $0 budget — all services must be free tier
- **Latency**: ~30-60s per page acceptable for V1 (CPU inference)
- **Accuracy**: Confidence scores required; never silently fabricate content
- **Compilation**: LaTeX must compile or return precise error pointing to the problematic region
- **Privacy**: No persistent user data in V1 (stateless/session-based)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single model first (Marker/Pix2Text) | Simpler to deploy, good baseline accuracy, add specialists later | — Pending |
| CPU inference on HF Spaces | Only free GPU option; accepts 30-60s latency | — Pending |
| Vercel + Supabase stack | Generous free tiers, good DX, easy to scale later | — Pending |
| Web-first, no mobile V1 | Faster to ship, mobile adds complexity | — Pending |
| Canonical JSON intermediate format | Decouples OCR from rendering, enables incremental re-runs | — Pending |
| Embed figures as images, not TikZ | Reliability over cleverness; TikZ generation too error-prone | — Pending |

---
*Last updated: 2026-01-26 after initialization*
