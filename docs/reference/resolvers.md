---
title: Resolvers
description: Resolver APIs, behavior, and implementation contract
---

# Resolvers

Resolvers define how `piq` fetches and shapes namespaced query data.

## Package

```bash
npm install @piqit/resolvers
```

## `fileMarkdown(options)`

Filesystem resolver for markdown documents with YAML frontmatter.

```typescript
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

const posts = fileMarkdown({
  base: 'content/posts',
  path: '{year}/{slug}.md',
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()),
  }),
  body: { raw: true, html: true, headings: true },
})
```

### Options

- `base: string`
- `path: string` with `{param}` placeholders
- `frontmatter: StandardSchema`
- `body?: { raw?: boolean; html?: boolean; headings?: boolean }`

### Query Behavior

- `scan` maps to path params derived from `path`.
- `filter` checks frontmatter values by strict equality.
- Resolver reads only data needed for selected namespaces:
- `params.*` does not require file content reads.
- `frontmatter.*` reads and parses frontmatter.
- `body.*` parses body according to requested fields.

### Runtime

`fileMarkdown` currently uses Bun APIs (`Bun.Glob`, `Bun.file`) and is intended for Bun environments.

## `staticContent(data)`

Static-data resolver for edge runtimes.

```typescript
import { staticContent } from '@piqit/resolvers/edge'

const postsResolver = staticContent(postsArray)
```

### Behavior

- `scan` filters `params` by equality.
- `filter` filters `frontmatter` by equality.
- `select` returns only selected namespaces/fields.
- Works without filesystem access.

### Alias

`staticResolver` is an alias of `staticContent`.

## Edge Entry

```typescript
import { staticContent } from '@piqit/resolvers/edge'
```

The edge entry exports only edge-safe APIs (`staticContent`, `staticResolver`).

## Utility Exports

`@piqit/resolvers` also exports utility helpers:

- Path pattern: `compilePattern`, `createParamsSchema`
- Frontmatter: `parseFrontmatter`, `readFrontmatter`, `readFrontmatterWithOffset`
- Markdown: `parseMarkdownBody`, `extractHeadings`, `slugify`, `markdownToHtml`

## Resolver Contract Summary

A resolver must expose:

- `schema.scanParams`
- `schema.filterParams`
- `schema.result`
- `resolve(spec)` returning namespaced partial rows

See [Resolver Types](/reference/types) for the generic interface.
