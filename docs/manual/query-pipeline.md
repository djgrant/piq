---
title: Query Pipeline
description: How piq's layered query chain works
---

# Query Pipeline

`piq` executes queries in ordered stages. Each stage narrows or reshapes the result set, and the chain shows which work happens before execution.

## Cost Model

The query builder uses four stages:

1. `scan()` narrows the candidate set with path-derived parameters. This is the cheapest stage.
2. `filter()` checks resolved data such as frontmatter fields. This stage requires loading candidates.
3. `select()` declares which fields to extract and which namespaces to materialize.
4. `exec()` or `stream()` executes the query and returns rows.

Each stage can increase work. The chain makes that cost visible before the query runs.

## Path-Driven Access Patterns

Path patterns are the first index. Structuring paths around your most common access dimension keeps queries in the cheap `scan` phase.

```typescript
// Path encodes year, so scan narrows without reading files
path: '{year}/{slug}.md'

.scan({ year: '2024' })
```

If frequently-filtered data lives only in frontmatter, every query pays the filter cost across a larger candidate set.

## Flat Results

Select paths are namespaced such as `params.slug` and `frontmatter.title`, but the final row is flattened by the last segment.

```typescript
.select('params.slug', 'frontmatter.title')
// { slug, title }
```

## Key Collision Detection and Aliases

If final segments collide, TypeScript fails the select at compile time.

```typescript
// compile-time error because both selections end in 'title'
.select('params.title', 'frontmatter.title')
```

Fix collisions with aliases:

```typescript
.select({
  routeTitle: 'params.title',
  postTitle: 'frontmatter.title',
})
```

## Filter Operators

Filter values match exactly by default. Pass `{ contains: '...' }` to substring-match a string field instead; on string-array fields it matches when any element contains the needle. Matching is case-sensitive.

```typescript
.filter({ status: 'published', subject: { contains: 'Rule 30' } })
```

## Sorting and Limiting

`sort()` orders results by a concrete dot-path. `limit()` caps the row count after sorting.

```typescript
// The five most recent published posts
.filter({ status: 'published' })
.sort('params.date', 'desc')
.limit(5)
.select('params.slug', 'frontmatter.title')
```

- Direction is `'asc'` by default.
- Chain `sort()` calls for multi-key sorts; earlier keys take precedence.
- A sort key does not need to appear in the select. The resolver materialises it for ordering, then the row is flattened from the select paths alone.
- Wildcard paths such as `frontmatter.*` are not valid sort keys.
- Numbers and dates compare numerically; everything else compares as strings. Missing values sort last.

## Execution Notes

- `select()` is required before `exec()`. Missing select throws at runtime.
- Repeated `scan()` or `filter()` calls merge constraints; later values win for overlapping keys.
- `single().exec()` returns the first row or `undefined`.
- `single().execOrThrow()` throws if zero rows are returned.
