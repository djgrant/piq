# Starlight Documentation Migration - Master

## Goal/Problem
Migrate the piq documentation from custom Astro pages to Starlight, Astro's documentation framework.

## Context
- piq is a query layer for document collections at `/Users/coder/Repos/ai/piq`
- The website lives at `piq/website`
- Current docs are 4 custom `.astro` pages in `src/pages/docs/`:
  - index.astro (Getting Started)
  - concepts.astro
  - api.astro
  - resolvers.astro
- These use a custom DocsLayout with hand-coded syntax highlighting
- The homepage (`/`) and playground (`/playground`) should remain as custom pages
- Starlight has been installed: `@astrojs/starlight ^0.37.2`
- Target: Cloudflare Pages deployment (keep existing adapter)

## Scope
- `piq/website/` directory only
- Does NOT touch: homepage, playground, API endpoint

## Success Criteria
1. Starlight serves documentation at `/docs/*` routes
2. All 4 documentation pages are migrated to MDX
3. Navigation sidebar matches current structure (Guide: Getting Started, Concepts; Reference: API, Resolvers)
4. Code examples render with syntax highlighting
5. Homepage and playground continue to work unchanged
6. `pnpm dev` runs without errors
7. `pnpm build` completes successfully

## Sub-Work Packages
1. wp-starlight-config - Configure Starlight integration in astro.config.mjs
2. wp-content-extraction - Extract .astro docs to MDX files
3. wp-cleanup - Remove old docs pages and layouts

## Results

### Iteration 1 - 2026-01-13

**Sub-work packages executed:**
1. wp-starlight-config - Configured Starlight integration, fixed social link syntax for v0.33.0+, created content.config.ts
2. wp-content-extraction - Converted 4 .astro pages to MDX files, stripped HTML syntax highlighting spans, converted to fenced code blocks
3. wp-cleanup - Removed old docs pages and DocsLayout

**Build status:** Successful
**All routes prerendered:** 3 docs pages indexed

**Files created:**
- src/content.config.ts
- src/content/docs/index.mdx (67 lines)
- src/content/docs/concepts.mdx (100 lines)
- src/content/docs/api.mdx (144 lines)
- src/content/docs/resolvers.mdx (117 lines)
- src/styles/starlight.css (placeholder)

**Files removed:**
- src/pages/docs/ (entire directory)
- src/layouts/DocsLayout.astro

**Files preserved:**
- src/pages/index.astro (homepage)
- src/pages/playground.astro
- src/pages/api/query.ts

## Status
Completed
