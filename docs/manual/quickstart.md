# Quick Start

This guide shows you how to define a Markdown resolver, runs a query, and shows how `scan()`, `filter()`, and `select()` shape the result.

## Define a resolver

```typescript
import { fileMarkdown } from "@piqit/resolvers";
import { z } from "zod";

export const posts = fileMarkdown({
  base: "content/posts",
  path: "{year}/{slug}.md",
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(["draft", "published"]),
    tags: z.array(z.string()).default([]),
  }),
  body: { html: true, headings: true },
});
```

### Resolver options

- `base`: base directory for content files.
- `path`: path pattern used for scan constraints and `params.*` extraction.
- `frontmatter`: StandardSchema-compatible schema (Zod works out of the box).
- `body`: optional body fields such as `raw`, `html`, and `headings`.

## Run a query

```typescript
import { piq } from "piqit";
import { posts } from "./posts-resolver";

const results = await piq
  .from(posts)
  .scan({ year: "2024" })
  .filter({ status: "published" })
  .select("params.slug", "frontmatter.title", "body.html")
  .exec();

// [{ slug: 'hello-world', title: 'Hello World', html: '<h1>...</h1>' }]
```

Note that query results are flattened, so a select with `params.slug` and `frontmatter.title` produces an output of `{ slug, title }`.

## Query steps

- `scan()` narrows by path parameters.
- `filter()` narrows by loaded fields such as frontmatter.
- `select()` declares returned fields and the resolver work needed to produce them.
- `exec()` runs query and returns all rows.

## Common variants

```typescript
// Alias output keys
.select({
  postSlug: "params.slug",
  postTitle: "frontmatter.title",
})

// Stream API
for await (const row of piq.from(posts).scan({}).select("params.slug").stream()) {
  console.log(row.slug);
}

// Single result helpers
const maybePost = await piq
  .from(posts)
  .scan({ year: "2024", slug: "hello-world" })
  .select("params.slug", "frontmatter.title")
  .single()
  .exec();
```
