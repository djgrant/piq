---
title: Getting Started
description: Install piq and run your first query
---

# Getting Started

This guide gets you from install to a working query.

## Install

```bash
npm install piqit @piqit/resolvers zod
```

`piqit` is the core fluent query API.
`@piqit/resolvers` provides resolver implementations such as `fileMarkdown` and `staticContent`.

## First Resolver

```typescript
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

export const posts = fileMarkdown({
  base: 'content/posts',
  path: '{year}/{slug}.md',
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()).default([]),
  }),
  body: { html: true, headings: true },
})
```

### Option Details

- `base`: base directory for content files.
- `path`: path pattern used for scan constraints and `params.*` extraction.
- `frontmatter`: StandardSchema-compatible schema (Zod works out of the box).
- `body`: optional. Enable `raw`, `html`, and/or `headings`.

## First Query

```typescript
import { piq } from 'piqit'
import { posts } from './posts-resolver'

const results = await piq
  .from(posts)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
  .select('params.slug', 'frontmatter.title', 'body.html')
  .exec()

// [{ slug: 'hello-world', title: 'Hello World', html: '<h1>...</h1>' }]
```

Results are flat. The last path segment becomes the key (`params.slug` -> `slug`).

## Query Steps

- `scan()` narrows by path params (cheap).
- `filter()` narrows by frontmatter fields (reads metadata).
- `select()` declares returned fields and required resolver work.
- `exec()` runs query and returns all rows.

## Common Variants

```typescript
// Alias output keys
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title',
})

// Stream API (currently resolves full result set first, then yields)
for await (const row of piq.from(posts).scan({}).select('params.slug').stream()) {
  console.log(row.slug)
}

// Single result helpers
const maybePost = await piq
  .from(posts)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('params.slug', 'frontmatter.title')
  .single()
  .exec()
```

## What To Read Next

- [Concepts](/guide/concepts)
- [API Reference](/reference/api)
- [Resolver Reference](/reference/resolvers)
- [Packages](/packages/)
