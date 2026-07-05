---
title: Resolvers
description: How resolvers provide data to piq queries
---

# Resolvers

Resolvers are piq's data access layer. 

A resolver defines where to locate records, which fields can be used to filter results, and how to materialise results.

## Resolver Contract

Every resolver exposes three schemas:

- **`scanParams`**: path-derived parameters that narrow the candidate set before any files are read.
- **`filterParams`**: equality-checked fields, usually frontmatter, that apply after candidates are loaded.
- **`result`**: the full data shape the resolver can produce, organized into namespaces such as `params`, `frontmatter`, and `body`.

`piq` uses these schemas to type query methods and select paths. The resolver receives the final query spec and decides how to satisfy it. `piq` does not perform joins or hidden planning.

## Execution Model

Each query should follow a `scan() -> filter() -> select() -> exec()` chain. 

Joining two queries is typically a design smell, and inicates that the resolver is not modelling the data effectively.

Resolves are simple executors. They do not have a query planner. Efficiency comes from well designed schemas.

## `fileMarkdown`

`fileMarkdown` reads Markdown files from disk using Bun APIs (`Bun.Glob`, `Bun.file`). It derives scan parameters from path placeholders, parses YAML frontmatter, and optionally renders Markdown to HTML.

```typescript
const posts = fileMarkdown({
  base: 'content/posts',
  path: '{year}/{slug}.md',
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
  }),
  body: { html: true, headings: true },
})
```

- Requires Bun runtime.
- Scan values come from path placeholders.
- Filter checks frontmatter equality.

Use `fileMarkdown` in Bun-based server and build contexts.

## `staticContent`

`staticContent` wraps a pre-compiled dataset in memory. It performs no filesystem or network I/O.

```typescript
const postsResolver = staticContent(precompiledPosts)
```

- No filesystem dependency.
- Works in edge runtimes, Cloudflare Workers, and browserless environments.

Use `staticContent` when filesystem access is unavailable, usually by building a dataset with `fileMarkdown` at build time and importing it into an edge runtime.
