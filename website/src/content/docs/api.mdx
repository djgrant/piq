---
title: API Reference
description: Complete API reference for piq query builder
---

# API Reference

## piq.from()

Create a query builder from a resolver.

```typescript
import { piq } from 'piqit'

const query = piq.from(posts)
```

---

## scan(constraints)

Finds items by pattern. This is your cheapest operation—it works at the collection level 
without reading file contents.

```typescript
// Find all posts from 2024
piq.from(posts).scan({ year: '2024' })

// Find a specific post
piq.from(posts).scan({ year: '2024', slug: 'hello-world' })

// Find all posts (empty constraints)
piq.from(posts).scan({})
```

For filesystem resolvers, scan leverages path structure. Constraints match the path 
parameters defined in your resolver.

---

## filter(constraints)

Narrows results by document-level criteria. Requires reading frontmatter from each item, 
so use after scan has narrowed the set.

```typescript
piq.from(posts)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
```

Filter parameters match the frontmatter schema. Only items where all filter values match 
are included.

---

## select(...paths) / select(aliases)

Declares which fields to include in results. Required before `exec()`.

### Variadic form

```typescript
.select('params.slug', 'params.year', 'frontmatter.title', 'body.html')
// Result: { slug: string; year: string; title: string; html: string }
```

### Object form (aliasing)

```typescript
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title',
  content: 'body.html'
})
// Result: { postSlug: string; postTitle: string; content: string }
```

### Wildcards

```typescript
.select('params.*')
// Result: { slug: string; year: string }  (all params fields)

.select('params.*', 'frontmatter.*')
// Result: { slug, year, title, status, tags, ... }
```

### Namespaces

For the `fileMarkdown` resolver:

- `params` — extracted from path patterns (free, from scan)
- `frontmatter` — YAML metadata (light I/O)
- `body` — parsed content (heavy I/O)

---

## exec()

Executes the query and returns all results as an array.

```typescript
const results = await piq.from(posts)
  .scan({ year: '2024' })
  .select('params.slug')
  .exec()
// results: Array<{ slug: string }>
```

---

## single()

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

---

## stream()

For large result sets, stream results instead of loading all into memory:

```typescript
for await (const post of piq.from(posts).scan({}).select('params.slug').stream()) {
  console.log(post.slug)
}
```
