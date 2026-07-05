# Introduction

piq is a cost-aware query client for document collections. 

It executes explicit `scan()`, `filter()`, and `select()` stages against resolver-backed content sources such as filesystems, prebuilt datasets, and remote APIs. 

```ts
import { piq } from "piqit";

const results = await piq
  .from(posts)
  .scan({ year: "2024" })
  .filter({ status: "published" })
  .select("params.slug", "frontmatter.title", "body.html")
  .exec();

// Results are flat and typed: [{ slug, title, html }]
```

The API is intentionally layered as `scan()`, `filter()`, `select()`, and `exec()`, so the query chain exposes its resolution cost directly.

## Core model

- `scan()` narrows candidates from path-derived fields before loading records.
- `filter()` applies equality checks to loaded data such as frontmatter fields.
- `select()` declares the output shape and controls which namespaces are materialized.
- Result rows are flat and typed, with compile-time collision detection for conflicting keys.
- Resolvers own the I/O strategy. `piq` types and executes the query spec, but it does not plan joins or hide waterfall costs.

## Packages

| Package | Role |
| --- | --- |
| `piqit` | Core query builder and type system |
| `@piqit/resolvers` | Resolver implementations (`fileMarkdown`, `staticContent`) |

## Runtime

- `piqit` is runtime-agnostic.
- `fileMarkdown` in `@piqit/resolvers` depends on Bun APIs (`Bun.Glob`, `Bun.file`).
- `staticContent` works in edge runtimes and browserless worker environments.
