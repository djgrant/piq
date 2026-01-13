# Remove Old Documentation Files

## Goal/Problem
Clean up the old custom documentation pages and layouts after Starlight migration is complete.

## Scope
Files to remove:
- `piq/website/src/pages/docs/` (entire directory)
- `piq/website/src/layouts/DocsLayout.astro`

Files to keep:
- `piq/website/src/pages/index.astro` (homepage)
- `piq/website/src/pages/playground.astro`
- `piq/website/src/pages/api/query.ts`
- `piq/website/src/layouts/Layout.astro`
- `piq/website/src/components/Header.astro`
- `piq/website/src/styles/global.css`

## Approach
1. Verify Starlight docs are working at `/docs/*`
2. Delete `src/pages/docs/` directory
3. Delete `src/layouts/DocsLayout.astro`
4. Test that homepage and playground still work
5. Test that docs routes work via Starlight

## Hypothesis
Once Starlight handles the `/docs/*` routes via content collections, the old pages-based docs can be safely removed without affecting other parts of the site.

## Dependencies
- wp-2026-01-13-starlight-config must be completed
- wp-2026-01-13-content-extraction must be completed

## Results
Completed successfully on 2026-01-13.

Removed:
- `src/pages/docs/` directory (4 files: api.astro, concepts.astro, index.astro, resolvers.astro)
- `src/layouts/DocsLayout.astro`

Verified retained:
- `src/pages/index.astro` - present
- `src/pages/playground.astro` - present
- `src/pages/api/` - present
- `src/layouts/Layout.astro` - present
- `src/components/Header.astro` - present

Starlight docs confirmed in place at `src/content/docs/` with 4 corresponding .mdx files.

## Evaluation
Success. Old documentation pages removed without affecting other site components. The site structure is now cleaner with docs served exclusively through Starlight.
