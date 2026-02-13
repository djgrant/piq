# Deployment Guide for piq.dev

This project uses a unified Cloudflare Pages deployment combining VitePress (static docs) and Astro (playground + API).

## Architecture

```
piq.dev
├── /                   → VitePress home
├── /guide/*            → VitePress docs
├── /reference/*        → VitePress docs  
├── /playground         → Astro (prerendered static)
└── /api/*              → Astro (SSR functions)
```

## How It Works

1. **VitePress** builds static HTML/CSS/JS to `docs/src/.vitepress/dist/`
2. **Astro** builds with `output: 'server'` to `website/dist/`:
   - Prerendered pages (like `/playground`) become static HTML
   - SSR routes (like `/api/*`) are bundled into `_worker.js`
3. **Build command** (`commands/site.build.ts`) merges both outputs:
   - VitePress output forms the base of `dist/`
   - Astro's `/playground` is copied into `dist/playground/`
   - Astro's `_worker.js` handles the `/api/*` routes

## Routes Configuration

The `_routes.json` file tells Cloudflare which routes go to the worker:

```json
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
```

- Routes in `include` are handled by `_worker.js` (SSR)
- All other routes are served statically from the CDN

## Commands

```bash
# Build both sites and merge
pok site build

# Build and deploy to Cloudflare Pages
pok deploy

# Development (run separately)
pok docs dev      # VitePress dev server at localhost:5173
pok website dev   # Astro dev server at localhost:4321
```

## Project Structure

```
piq/
├── docs/                    # VitePress documentation
│   ├── src/
│   │   ├── index.md         # Home page
│   │   ├── guide/           # Guide pages
│   │   └── reference/       # API reference
│   └── .vitepress/
│       └── config.ts        # VitePress config
├── website/                 # Astro playground + API
│   └── src/
│       └── pages/
│           ├── playground.astro  # Prerendered (export const prerender = true)
│           └── api/
│               └── query.ts      # SSR endpoint (export const prerender = false)
├── commands/
│   └── site.build.ts        # Unified site build command
├── wrangler.toml            # Cloudflare config
└── dist/                    # Combined output (gitignored)
```

## First-Time Setup

1. Create Cloudflare Pages project:
   ```bash
   npx wrangler pages project create piq
   ```

2. Configure custom domain in Cloudflare dashboard:
   - Add `piq.dev` as custom domain
   - Update DNS to point to Cloudflare Pages

3. Deploy:
   ```bash
   pok deploy
   ```

## Troubleshooting

### API routes return 404
- Ensure `_worker.js` is being copied to `dist/`
- Check that `_routes.json` includes `/api/*`

### Playground shows VitePress 404
- Ensure Astro's playground page has `export const prerender = true`
- Check that `dist/playground/index.html` exists after build

### Changes not reflected
- Cloudflare caches aggressively; try hard refresh or purge cache
- Check build output in `dist/` directory
