---
title: Packages
description: Package-level overview for the piq monorepo
---

# Packages

This repo contains published packages plus project apps used for docs/playground/deployment.

## Published Packages

- [`piqit`](/packages/piqit): core query builder and type system.
- [`@piqit/resolvers`](/packages/resolvers): resolver implementations and resolver utilities.

## Workspace Apps

- `docs`: VitePress documentation site.
- `playground`: local Bun playground and content fixtures.
- `website`: Astro marketing/site surface.

## Install

```bash
npm install piqit @piqit/resolvers
```

## Monorepo Scripts

From repo root:

```bash
bun run build
bun run test
bun run check
```
