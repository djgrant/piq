---
name: piq
description: Query document collections with the piq CLI and build cost-aware, type-safe TypeScript queries with piqit. Use when discovering or reading a repo's Markdown and other file-backed collections, configuring piq.config.ts, defining resolvers, or writing scan/filter/select queries.
---

# piq

piq reads collections of documents and returns only the fields a query asks for. A collection might be a directory of Markdown posts, notes, or other structured records.

Each collection has a resolver. The resolver knows how to find its records and exposes their data in namespaces. For a Markdown collection, these are typically:

- `params.*` — values taken from the file path, such as a year or slug
- `frontmatter.*` — metadata read from the document
- `body.*` — parsed document content
- `file.path` — the source file path

A query progressively reduces a collection into result rows:

```text
collection → scan by path → filter by document data → select fields → rows
```

Each returned row is a flat object. Selecting `params.slug` and `frontmatter.title`, for example, produces `{ slug, title }`.

This progression also avoids unnecessary work. Path values are already known while finding files, frontmatter requires opening files, and body fields may require parsing or rendering content. Therefore, narrow with `scan` first, use `filter` only where needed, and `select` only the fields the task requires.

## Query a repository as an agent

When a repository has `piq.config.ts`, prefer the `piq` CLI over hand-maintained indexes or broad file reads. Run `piq skill` at any time to print these instructions; it does not require a project config.

```bash
# Discover configured collections and their queryable fields
piq

# Inspect one collection
piq posts --schema

# Select only the fields needed for the task
piq posts \
  --scan year=2024 \
  --filter status=published \
  --select params.slug,frontmatter.title,file.path
```

Follow this workflow:

1. Run `piq` to discover collections.
2. Run `piq <collection> --schema` before constructing a query; do not guess field names.
3. Narrow with `--scan` before `--filter` whenever the schema permits.
4. Select only the fields needed. Include `file.path` when source files must be cited, inspected, or edited.
5. Use the default JSON Lines output for pipelines, `--json` for one array, `--table` for human inspection, and `--raw` or `--raw0` for a single scalar field.

```bash
# Find source files safely, including paths containing whitespace
piq posts --filter status=draft --select file.path --raw0 | xargs -0 grep -l TODO

# Substring matching is case-sensitive
piq posts --filter 'title~=release' --select params.slug,frontmatter.title --json

# Sort before limiting
piq posts --sort params.date:desc --limit 5 --select params.slug,frontmatter.title --table
```

`--scan`, `--filter`, and `--sort` are repeatable. Scalar filter values coerce `true`, `false`, `null`, and numbers. Raw output requires exactly one selected scalar path.

**Full docs:** [CLI](https://raw.githubusercontent.com/djgrant/piq/main/docs/manual/cli.md)

## Configure the CLI

Install the Bun-based CLI and define collections in `piq.config.ts` at the project root.

```bash
npm install @piqit/cli @piqit/resolvers zod
```

```ts
// piq.config.ts
import { defineConfig } from '@piqit/cli'
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

export default defineConfig({
  collections: {
    posts: fileMarkdown({
      base: 'content/posts',
      path: '{year}/{slug}.md',
      frontmatter: z.object({
        title: z.string(),
        status: z.enum(['draft', 'published']),
      }),
    }),
  },
})
```

The CLI finds the nearest config by walking up from the current directory. Relative resolver bases resolve from the config directory.

## Build a TypeScript query

Install the core query builder and resolver package:

```bash
npm install piqit @piqit/resolvers zod
```

```ts
import { piq } from 'piqit'
import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

const posts = fileMarkdown({
  base: 'content/posts',
  path: '{year}/{slug}.md',
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(['draft', 'published']),
    tags: z.array(z.string()),
  }),
  body: { raw: true, html: true, headings: true },
})

const rows = await piq
  .from(posts)
  .scan({ year: '2024' })
  .filter({ status: 'published' })
  .sort('params.slug', 'asc')
  .select('params.slug', 'frontmatter.title', 'body.html')
  .exec()
```

Design and write queries in cost order:

- `scan()` uses path-derived parameters and is cheapest. Encode common access dimensions in paths.
- `filter()` resolves candidate data such as frontmatter. Use exact values or `{ contains: 'text' }`.
- `sort()` orders by a concrete dot-path; repeated sorts form a multi-key sort.
- `limit()` caps rows after sorting.
- `select()` is required and controls both result shape and materialisation work.
- `exec()` returns an array; `stream()` yields rows without collecting all results.

Repeated `scan()` and `filter()` calls merge constraints, with later values replacing overlapping keys.

**Full docs:** [Quick start](https://raw.githubusercontent.com/djgrant/piq/main/docs/manual/quickstart.md) · [Query pipeline](https://raw.githubusercontent.com/djgrant/piq/main/docs/manual/query-pipeline.md) · [Recipes](https://raw.githubusercontent.com/djgrant/piq/main/docs/manual/recipes.md)

## Select fields and shape results

Selected dotted paths produce flat rows keyed by their final segment.

```ts
.select('params.slug', 'frontmatter.title')
// { slug: string, title: string }
```

Use object selection to choose output names or resolve final-segment collisions:

```ts
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title',
})
```

Use namespace wildcards only when the complete payload is needed:

```ts
.select('params.*', 'frontmatter.*')
```

Do not select two paths with the same final segment in variadic form. piq reports this as a TypeScript error; alias them with object selection instead. A sort path need not be selected, but wildcard paths cannot be sort keys.

## Fetch one result

```ts
const maybePost = await piq
  .from(posts)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('frontmatter.title', 'body.raw')
  .single()
  .exec()

const post = await piq
  .from(posts)
  .scan({ year: '2024', slug: 'hello-world' })
  .select('frontmatter.title', 'body.raw')
  .single()
  .execOrThrow()
```

`single().exec()` returns the first row or `undefined`. `single().execOrThrow()` throws when no row exists.

## Choose a resolver

Use `fileMarkdown` for Markdown files in Bun-based server or build environments. It exposes:

- `params.*` from `{placeholder}` values in the path, available during scan
- `frontmatter.*` validated by any Standard Schema-compatible schema
- optional `body.raw`, `body.html`, and `body.headings`
- `file.path` for the source path

```ts
const notes = fileMarkdown({
  base: 'notes',
  path: '{date}< {time}> - {subject} [{id}].md',
  frontmatter: z.object({ tags: z.array(z.string()) }),
  body: { raw: true },
})
```

Path patterns support named placeholders (`{slug}`), regex constraints (`{year:\d+}`), and non-nested optional segments (`<...>`).

Use `staticContent` for precompiled records in edge runtimes, Cloudflare Workers, or other environments without filesystem access:

```ts
import { staticContent } from '@piqit/resolvers/edge'

const posts = staticContent(precompiledPosts)
```

Compile complete content at build time with `fileMarkdown`, then import it and query through `staticContent` at runtime.

**Full docs:** [Resolvers](https://raw.githubusercontent.com/djgrant/piq/main/docs/manual/resolvers.md) · [Resolver package](https://raw.githubusercontent.com/djgrant/piq/main/docs/packages/resolvers.md)

## Model access patterns deliberately

- Put frequently queried, high-cardinality values in the path so `scan()` can narrow without reading documents.
- Keep expensive body fields out of `select()` unless needed.
- Prefer explicit selections over wildcards to limit work and context size.
- Treat a single waterfall between related queries as acceptable, but avoid N+1 query loops; batch or remodel the resolver instead.
- Remember that piq provides no joins, writes, indexes, or hidden query planner. The resolver controls how a declared query is satisfied.
