# piq

[![Experimental](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anomalyco/ai)

A document-based, cost-aware query interface for TypeScript.

## What is piq?

**piq** is a query layer for document collections. It's designed for content-heavy applications where you're reading structured files (markdown, JSON, etc.) and want explicit control over resolution cost.

**Document-based:** Works with discrete items. No joins at the query layer—relationships are your responsibility. Waterfalls are valid; N+1 is the smell.

**Cost-aware:** The layered model surfaces resolution cost as a first-class API concept. You know what you're paying for.

**Query interface:** Read-only. No storage engine, no writes, no indexes. Queries run against a source of truth that something else manages.

## Installation

```bash
npm install piqit @piqit/resolvers
```

## Documentation

The docs are organized into three sections that match the docs site structure.

### Guide

- [Getting Started](docs/guide/index.md)
- [Concepts](docs/guide/concepts.md)
- [Recipes](docs/guide/recipes.md)

### Reference

- [API Reference](docs/reference/api.md)
- [Resolvers](docs/reference/resolvers.md)
- [Resolver Types](docs/reference/types.md)

### Packages

- [Packages Overview](docs/packages/index.md)
- [`piqit`](docs/packages/piqit.md)
- [`@piqit/resolvers`](docs/packages/resolvers.md)

## Packages

This repo ships two published packages:

| Package | Purpose | Entry points |
| --- | --- | --- |
| `piqit` | Core fluent query builder, select typing, and flattening utilities | `piqit` |
| `@piqit/resolvers` | Resolver implementations and content parsing helpers | `@piqit/resolvers`, `@piqit/resolvers/edge`, `@piqit/resolvers/static` |

Workspace apps (not published packages):

- `docs` - VitePress documentation
- `playground` - Bun playground and examples
- `website` - Astro site surface

## Quick Start

```typescript
import { piq } from 'piqit'
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

// Create a resolver for markdown posts
const posts = fileMarkdown({
  base: 'content/posts',
  path: '{year}/{slug}.md',
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()),
  }),
  body: { html: true, headings: true }
})

// Query for published posts from 2024
const results = await piq.from(posts)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
  .select('params.slug', 'frontmatter.title', 'body.html')
  .exec()

// Results are FLAT - field names from the last path segment:
// [{ slug: 'hello-world', title: 'Hello World', html: '<p>...' }]
```

## Core Design Principles

**Cost-awareness is the core abstraction.** The API makes resolution cost visible. The layers aren't implementation detail—they're the API contract.

**Explicit over implicit.** Users declare what they're paying for. No hidden work.

**Progressive resolution.** Scan -> filter -> select. Each step is opt-in.

**Minimal and cheap by default.** Return minimal data. User adds more explicitly.

**Invalid queries are type errors.** Not runtime surprises. TypeScript catches mistakes.

**piq says what, resolver says how.** The query declares intent. The resolver figures out the cheapest way to satisfy it.

## The Fluent API

Queries follow a method chain that matches cost escalation:

```typescript
piq.from(posts)
  .scan({ year: '2024' })    // enumerate by pattern (cheap)
  .filter({ status: 'published' })  // narrow by criteria (costs I/O)
  .select('params.slug', 'frontmatter.title')  // what to read
  .exec()  // execute
```

### scan()

Finds items by pattern. This is your cheapest operation—it works at the collection level without reading file contents.

```typescript
// Find all posts from 2024
piq.from(posts).scan({ year: '2024' })

// Find a specific post
piq.from(posts).scan({ year: '2024', slug: 'hello-world' })

// Find all posts (empty constraints)
piq.from(posts).scan({})
```

For filesystem resolvers, scan leverages path structure. Put high-cardinality, frequently-filtered fields in your path pattern.

### filter()

Narrows results by document-level criteria. Requires reading frontmatter from each item, so use after scan has narrowed the set.

```typescript
// Find published posts from 2024
piq.from(posts)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
```

Filter parameters match the frontmatter schema. Only items where all filter values match are included.

### select()

Declares which fields to include in results. **Required before exec().**

The select API uses dotted paths and produces **flat results**—the final segment of each path becomes the property name.

```typescript
.select('params.slug', 'frontmatter.title', 'body.html')
// Result: { slug: 'hello-world', title: 'Hello World', html: '<p>...' }
```

### exec()

Executes the query and returns all results as an array.

```typescript
const results = await piq.from(posts)
  .scan({ year: '2024' })
  .select('params.slug')
  .exec()
// results: Array<{ slug: string }>
```

### single()

Returns a builder for single-result queries.

```typescript
// Returns first result or undefined
const post = await piq.from(posts)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('params.slug', 'frontmatter.title')
  .single()
  .exec()

// Throws if no results
const post = await piq.from(posts)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('params.slug')
  .single()
  .execOrThrow()
```

### stream()

For large result sets, stream results instead of loading all into memory:

```typescript
for await (const post of piq.from(posts).scan({}).select('params.slug').stream()) {
  console.log(post.slug)
}
```

## The Select API

Select uses dotted-string paths that map to the resolver's namespaced output. Results are **flat**—the last segment of each path becomes the property name.

### Namespaces

For the `fileMarkdown` resolver:

- `params` — extracted from path patterns (free, from scan)
- `frontmatter` — YAML metadata (light I/O)
- `body` — parsed content (heavy I/O)

### Variadic Strings

The simplest form—list the fields you want:

```typescript
.select('params.slug', 'params.year', 'frontmatter.title', 'body.html')

// Result type inferred as:
// { slug: string; year: string; title: string; html: string }
```

The field name is the last segment of each path.

### Object Form (Aliasing)

When you need custom property names or have naming collisions:

```typescript
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title',
  content: 'body.html'
})

// Result: { postSlug: string; postTitle: string; content: string }
```

### Wildcards

Select all fields from a namespace:

```typescript
.select('params.*')
// Result: { slug: string; year: string }  (all params fields)

.select('params.*', 'frontmatter.*')
// Result: { slug, year, title, status, tags, ... }
```

### Collision Detection

If two paths have the same final segment, TypeScript reports a compile-time error:

```typescript
// ERROR: 'title' appears in both paths
.select('params.title', 'frontmatter.title')

// FIX: use object form to alias
.select({ paramTitle: 'params.title', frontmatterTitle: 'frontmatter.title' })
```

This prevents runtime surprises where one field overwrites another.

## Defining Resolvers

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
'{year}/{slug}.md'           // Matches: 2024/hello-world.md
'{category}/{year}/{slug}.md' // Matches: tech/2024/my-post.md
```

Parameters extracted from the path are available as `params.*` in select.

### StandardSchema

Frontmatter schemas use [StandardSchema](https://github.com/standard-schema/standard-schema), compatible with:

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

## Edge / Worker Environments

For environments without filesystem access (Cloudflare Workers, etc.), use the `staticContent` resolver with pre-compiled content.

### Entry Points

- `@piqit/resolvers` — Full package (includes `fileMarkdown` and `staticContent`)
- `@piqit/resolvers/edge` — Edge-only (only `staticContent`, no Node.js dependencies)

### Build Step

Compile content at build time:

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

### Worker Usage

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

## Design Patterns

### Encode filters in the scan

Put high-cardinality, frequently-filtered fields in your path pattern where enumeration can extract them:

```typescript
// Good: year in path, filterable without I/O
fileMarkdown({ path: '{year}/{slug}.md' })
.scan({ year: '2024' })  // Fast - just glob pattern

// Less efficient: year only in frontmatter
.scan({})
.filter({ year: '2024' })  // Must read every file
```

### Let scan return meta for free

Design sources so enumeration carries summary data. The `params` namespace comes from the path—it's free.

```typescript
// Path: {status}/{date}/{slug}.md
.scan({ status: 'published' })
.select('params.date', 'params.slug')  // Free data from path
```

### Filter is for narrowing large sets

Use filter when you need data not encodable in the path:

```typescript
.scan({ year: '2024' })           // Narrow to ~50 files
.filter({ status: 'published' })  // Further narrow by frontmatter
.select('params.slug', 'body.html')
```

### Waterfalls are fine; N+1 is the smell

Fetching a post then its author is one waterfall—acceptable.

```typescript
// Fine: one query, then one more
const post = await getPost(slug)
const author = await getAuthor(post.authorId)
```

Fetching 100 posts then 100 separate author queries is N+1—restructure or batch.

```typescript
// Bad: 100 posts, 100 author queries
for (const post of posts) {
  const author = await getAuthor(post.authorId)  // N+1!
}
```

## Comparison to GraphQL

GraphQL coordinates resolvers but hides cost. piq surfaces cost as the core abstraction.

**Relationships:** GraphQL treats them as first-class. piq leaves them to you.

**Cost model:** GraphQL hides it behind resolvers. piq makes it explicit via namespaces.

**N+1:** GraphQL makes it the resolver's problem (DataLoader, etc.). piq makes it visible to you.

**Query language:** GraphQL has a custom DSL. piq uses fluent TypeScript with full type inference.

## Comparison to DynamoDB

Like DynamoDB, piq rewards designing your access patterns into your data structure upfront. The query harvests structure created at write time.

**Where the analogy holds:**

- Design access patterns upfront
- Encode frequently-filtered fields where they're cheap to access
- No joins at the query layer—denormalize or structure for single-collection queries

**Where it diverges:**

- DynamoDB benefits from colocation (same partition = same node)
- piq's benefit is *layer locality*—which layer encodes which data determines cost, not physical proximity

## License

MIT
