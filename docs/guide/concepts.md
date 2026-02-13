---
title: Concepts
description: Core concepts and design tradeoffs in piq
---

# Concepts

`piq` keeps resolution cost explicit and pushes data-layout decisions to the model you define.

## Cost Model

The API is intentionally layered:

1. `scan()`
2. `filter()`
3. `select()`
4. `exec()` or `stream()`

Each phase can increase work. You can reason about cost from the chain itself.

## Path-Driven Access Patterns

Path patterns are the first index.

```typescript
// Better for year-based access
path: '{year}/{slug}.md'

// Then queries can stay in scan
.scan({ year: '2024' })
```

If you keep frequently-filtered data only in frontmatter, you pay the filter cost for larger candidate sets.

## Flat Results

Select paths are namespaced (`params.slug`, `frontmatter.title`), but output is flattened by final segment.

```typescript
.select('params.slug', 'frontmatter.title')
// { slug, title }
```

If final segments collide, TypeScript fails the select at compile time.

```typescript
// compile-time error
.select('params.title', 'frontmatter.title')

// fix via aliases
.select({
  routeTitle: 'params.title',
  postTitle: 'frontmatter.title',
})
```

## Explicit Over Magic

`piq` does not do joins or relational planning.

- One waterfall: usually acceptable.
- N+1 waterfall: usually a design smell.

The resolver gets a fully explicit query spec and decides how to satisfy it.

## Schema Boundary

Resolvers expose three schemas:

- `scanParams`
- `filterParams`
- `result`

`piq` uses those to type query methods and select paths.

## Current Behavioral Notes

- `select()` is required before `exec()`. Missing select throws at runtime.
- Repeated `scan()` or `filter()` calls merge constraints; later values win for overlapping keys.
- `single().exec()` returns first row or `undefined`.
- `single().execOrThrow()` throws if zero rows are returned.

## Runtime Positioning

- Use `fileMarkdown` in Bun-based server/build contexts.
- Use `staticContent` for edge runtimes where filesystem access is not available.
