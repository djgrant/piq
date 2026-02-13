---
title: Recipes
description: Common query patterns and resolver usage recipes
---

# Recipes

## Published Posts by Year

```typescript
const posts = await piq
  .from(postsResolver)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
  .select('params.slug', 'frontmatter.title', 'frontmatter.tags')
  .exec()
```

## Detail Page Query

```typescript
const post = await piq
  .from(postsResolver)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('frontmatter.title', 'body.html', 'body.headings')
  .single()
  .execOrThrow()
```

## Avoiding Key Collisions

```typescript
const row = await piq
  .from(postsResolver)
  .scan({ year: '2024', slug: 'hello-world' })
  .select({
    postSlug: 'params.slug',
    postTitle: 'frontmatter.title',
  })
  .single()
  .exec()
```

## Namespace Wildcards

```typescript
const rows = await piq
  .from(postsResolver)
  .scan({ year: '2024' })
  .select('params.*', 'frontmatter.*')
  .exec()
```

Use wildcards when you need broad namespace output; prefer explicit fields in stable production contracts.

## Build-Time Static Dataset for Edge

```typescript
// build-content.ts (Bun)
const allPosts = await piq
  .from(postsResolver)
  .scan({})
  .select('params.*', 'frontmatter.*', 'body.*')
  .exec()

await Bun.write('src/generated/posts.ts', `export const posts = ${JSON.stringify(allPosts)} as const`)
```

```typescript
// worker.ts
import { piq } from 'piqit'
import { staticContent } from '@piqit/resolvers/edge'
import { posts } from './generated/posts'

const postsResolver = staticContent([...posts])

const rows = await piq
  .from(postsResolver)
  .scan({ year: '2024' })
  .select('params.slug', 'frontmatter.title')
  .exec()
```
