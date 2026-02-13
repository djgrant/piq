---
layout: doc
title: Documentation
description: piq documentation hub
---

# piq Documentation

`piq` is a cost-aware query layer for document collections.

## What You Get

- Explicit query pipeline: `scan -> filter -> select -> exec`
- Type-safe selects with compile-time collision detection
- Flat result shapes for ergonomic consumers
- Resolver model that keeps data access strategy pluggable

## Start Here

- [Getting Started](/guide/)
- [Concepts](/guide/concepts)
- [API Reference](/reference/api)
- [Resolver Reference](/reference/resolvers)
- [Packages Overview](/packages/)

## Package Docs

- [`piqit`](/packages/piqit)
- [`@piqit/resolvers`](/packages/resolvers)

## Runtime Notes

- `piqit` is runtime-agnostic.
- `fileMarkdown` in `@piqit/resolvers` currently depends on Bun APIs (`Bun.Glob`, `Bun.file`).
- `staticContent` works in edge runtimes and browserless worker environments.
