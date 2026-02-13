---
title: API Reference
description: Complete API reference for piq query builder
---

# API Reference

## Import

```typescript
import { piq, from } from 'piqit'
```

## Entry Points

### `piq.from(resolver)`

Creates a `QueryBuilder` from a resolver.

```typescript
const query = piq.from(postsResolver)
```

### `from(resolver)`

Equivalent helper export.

```typescript
const query = from(postsResolver)
```

## QueryBuilder

### `scan(constraints)`

Adds or updates scan constraints.

- Type: `Partial<ScanParams>`
- Behavior: merged with previous scan constraints (`{ ...prev, ...next }`)

```typescript
const q = piq.from(postsResolver)
  .scan({ year: '2024' })
  .scan({ slug: 'hello-world' })
```

### `filter(constraints)`

Adds or updates filter constraints.

- Type: `Partial<FilterParams>`
- Behavior: merged with previous filter constraints (`{ ...prev, ...next }`)

```typescript
const q = piq.from(postsResolver)
  .filter({ status: 'published' })
```

### `select(...paths)`

Selects output fields using dotted path strings.

- Paths are resolver-driven and type-checked.
- Compile-time collision detection prevents duplicate final keys.
- Returns a new `QueryBuilder` with updated result typing.

```typescript
.select('params.slug', 'frontmatter.title', 'body.html')
// -> { slug, title, html }
```

#### Wildcards

```typescript
.select('params.*')
.select('params.*', 'frontmatter.*')
```

Wildcards expand at runtime using keys present in the selected namespace object.

### `select(aliases)`

Alias form for custom output keys.

```typescript
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title',
})
// -> { postSlug, postTitle }
```

### `exec()`

Runs query and returns all rows.

- Return type: `Promise<TResult[]>`
- Throws if `select()` was never called.

```typescript
const rows = await piq.from(postsResolver)
  .scan({ year: '2024' })
  .select('params.slug')
  .exec()
```

### `single()`

Returns `SingleQueryBuilder<TResult>`.

```typescript
const single = piq.from(postsResolver)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('params.slug')
  .single()
```

## SingleQueryBuilder

### `exec()`

Returns first row or `undefined`.

```typescript
const maybeRow = await query.single().exec()
```

### `execOrThrow()`

Returns first row, throws if result set is empty.

```typescript
const row = await query.single().execOrThrow()
```

## Streaming

### `stream()`

Returns `AsyncGenerator<TResult>`.

```typescript
for await (const row of piq.from(postsResolver).scan({}).select('params.slug').stream()) {
  console.log(row.slug)
}
```

Current implementation calls `exec()` first, then yields rows one-by-one.

## Result Shaping Rules

1. Resolver returns namespaced partial objects.
2. `piq` flattens them:
- Path form: final segment becomes key.
- Alias form: alias key becomes key.
3. Wildcards are expanded before flattening.

## Errors

- Missing `select()` before `exec()` -> runtime error.
- `single().execOrThrow()` with zero rows -> runtime error.
- Invalid select collisions -> compile-time TypeScript error.
