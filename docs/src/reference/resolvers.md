---
title: Resolvers
description: How to use and create resolvers for piq
---

# Resolvers

Resolvers define how piq reads and parses content. The core package provides the query 
builder; resolver packages provide the data sources.

## @piqit/resolvers

```bash
npm install @piqit/resolvers
```

### fileMarkdown

The primary resolver for markdown content with YAML frontmatter.

```typescript
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

const posts = fileMarkdown({
  // Base directory for finding files
  base: 'content/posts',
  
  // Path pattern with {param} placeholders
  path: '{year}/{slug}.md',
  
  // Schema for frontmatter (any StandardSchema-compatible library)
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()).default([]),
  }),
  
  // Body parsing options
  body: {
    raw: true,      // Include raw markdown
    html: true,     // Include HTML conversion
    headings: true  // Extract headings with slugs
  }
})
```

### Path Patterns

Path patterns use `{param}` syntax to define URL-style segments:

```typescript
'{year}/{slug}.md'            // Matches: 2024/hello-world.md
'{category}/{year}/{slug}.md' // Matches: tech/2024/my-post.md
```

Parameters extracted from the path are available as `params.*` in select.

### StandardSchema

Frontmatter schemas use [StandardSchema](https://github.com/standard-schema/standard-schema), 
compatible with:

- Zod
- Valibot
- ArkType
- Any library implementing the standard

### Body Options

Control what gets parsed from the markdown body:

```typescript
body: {
  raw: true,      // string - original markdown
  html: true,     // string - converted to HTML
  headings: true  // Heading[] - extracted heading structure
}
```

The `Heading` type:

```typescript
interface Heading {
  depth: number   // 1-6
  text: string    // Heading text
  slug: string    // URL-safe slug
}
```

### staticContent

A resolver for edge environments like Cloudflare Workers where filesystem access is not available. Content is compiled at build time and bundled as a static module.

```typescript
import { staticContent } from '@piqit/resolvers'
// or for edge-only bundles:
import { staticContent } from '@piqit/resolvers/edge'
```

#### Build Step

Compile your content at build time:

```typescript
import { fileMarkdown } from '@piqit/resolvers'
import { piq } from 'piqit'

const posts = fileMarkdown({ base: 'content/posts', path: '{year}/{slug}.md', ... })

const allPosts = await piq.from(posts)
  .scan({})
  .select('params.*', 'frontmatter.*', 'body.*')
  .exec()

await Bun.write(
  'src/generated/content.ts',
  `export const posts = ${JSON.stringify(allPosts)};`
)
```

#### Worker Usage

```typescript
import { posts } from './generated/content'
import { staticContent } from '@piqit/resolvers/edge'
import { piq } from 'piqit'

const postsResolver = staticContent(posts)

export default {
  async fetch(request: Request) {
    const results = await piq.from(postsResolver)
      .scan({ year: '2024' })
      .select('params.slug', 'frontmatter.title')
      .exec()

    return Response.json(results)
  }
}
```

## Writing Custom Resolvers

Resolvers implement the `Resolver` interface. A resolver must define schemas 
for scan parameters, filter parameters, and the result shape, plus a `resolve()` 
method that executes queries.

```typescript
import type { Resolver, QuerySpec } from 'piqit'

const myResolver: Resolver<ScanSchema, FilterSchema, ResultSchema> = {
  schema: {
    scanParams: scanSchema,
    filterParams: filterSchema,
    result: resultSchema,
  },
  
  async resolve(spec: QuerySpec) {
    // spec.scan - scan constraints
    // spec.filter - filter constraints  
    // spec.select - fields to return
    return results
  }
}
```

See the [source code](https://github.com/djgrant/piq) for 
`fileMarkdown` as a reference implementation.
