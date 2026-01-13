#!/bin/bash
set -e

echo "Building piq.dev..."

# Clean previous build
rm -rf dist

# Build VitePress docs
echo "Building VitePress docs..."
cd docs
pnpm build
cd ..

# Build Astro (landing + playground + API)
echo "Building Astro..."
cd website
pnpm build
cd ..

# Create unified dist directory
echo "Merging outputs..."
mkdir -p dist

# Copy Astro output as the base (landing page, playground, API)
cp -r website/dist/* dist/

# Copy VitePress output to /docs/
mkdir -p dist/docs
cp -r docs/src/.vitepress/dist/* dist/docs/

# Create _routes.json for Cloudflare Pages
cat > dist/_routes.json << 'ROUTES'
{
  "version": 1,
  "include": ["/api/*"],
  "exclude": []
}
ROUTES

echo "Build complete! Output in ./dist"
echo ""
echo "Routes:"
echo "  /              -> Astro landing page"
echo "  /playground    -> Astro playground"
echo "  /api/*         -> Astro SSR"
echo "  /docs/*        -> VitePress docs"
