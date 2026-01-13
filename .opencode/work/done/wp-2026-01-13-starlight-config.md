# Configure Starlight Integration

## Goal/Problem
Set up Starlight in the existing piq website so it serves documentation at `/docs/*` while keeping the custom homepage and playground pages.

## Scope
- `piq/website/astro.config.mjs`
- `piq/website/src/content.config.ts` (new file)
- `piq/website/src/content/docs/` (new directory)

## Approach
1. Create `src/content.config.ts` with Starlight's docsLoader and docsSchema
2. Update `astro.config.mjs` to:
   - Import and add starlight integration
   - Configure title: 'piq'
   - Configure sidebar with two groups:
     - "Guide": Getting Started (slug: index), Concepts (slug: concepts)
     - "Reference": API (slug: api), Resolvers (slug: resolvers)
   - Add GitHub social link: https://github.com/djgrant/piq
3. Create placeholder `src/content/docs/index.md` so the site can build
4. Ensure existing cloudflare adapter and vite config remain intact

## Hypothesis
Adding Starlight as an integration will automatically handle the `/docs/*` routes via content collections, while leaving the pages-based routing for `/` and `/playground` untouched.

## Results

### Completed Tasks

1. **content.config.ts** - Already existed with correct configuration (docsLoader + docsSchema)

2. **astro.config.mjs** - Was already configured with Starlight, but required one fix:
   - Updated `social` config from object syntax to array syntax (required by Starlight v0.33.0+)
   - Changed from `{ github: '...' }` to `[{ icon: 'github', label: 'GitHub', href: '...' }]`

3. **Created placeholder docs** - Added 4 markdown files in `src/content/docs/`:
   - `index.md` - Getting Started page
   - `concepts.md` - Concepts page
   - `api.md` - API Reference page
   - `resolvers.md` - Resolvers page

4. **Created starlight.css** - Added `src/styles/starlight.css` placeholder (was referenced in config but didn't exist)

5. **Cloudflare adapter and vite config** - Remained intact as required

### Build Output
- Build succeeded with all routes generated:
  - `/` (homepage)
  - `/playground/`
  - `/docs/` (Starlight-managed)
  - `/docs/concepts/`
  - `/docs/api/`
  - `/docs/resolvers/`
- Pagefind search index generated (3 pages indexed)

## Evaluation

**Hypothesis confirmed.** Starlight handles `/docs/*` routes via content collections while pages-based routing (`/`, `/playground`) remains untouched. The build completes successfully with both routing systems coexisting.
