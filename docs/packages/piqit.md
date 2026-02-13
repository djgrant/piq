---
title: piqit
description: Core query builder package
---

# `piqit`

Core package for query building, result shaping, and type-safe select inference.

## Install

```bash
npm install piqit
```

## Exports

```typescript
import {
  piq,
  from,
  QueryBuilder,
  SingleQueryBuilder,
  undot,
  undotWithAliases,
  undotAll,
  undotAllWithAliases,
  expandWildcards,
} from 'piqit'
```

Also exports type contracts/utilities including:

- `StandardSchema`, `Infer`
- `Resolver`, `QuerySpec`
- `SelectablePaths`, `HasCollision`, `Undot`, `UndotWithAliases`

## Primary API

```typescript
import { piq } from 'piqit'

const rows = await piq
  .from(postsResolver)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
  .select('params.slug', 'frontmatter.title')
  .exec()
```

## Behavioral Notes

- `select()` is required before execution.
- `scan()` and `filter()` merge constraints across repeated calls.
- `single()` wraps a query for first-row access (`exec`, `execOrThrow`).
- `stream()` currently emits from an already-resolved result array.

## Build/Check (Workspace)

```bash
bun run --filter piqit build
bun run --filter piqit check
```
