---
title: CLI
description: Query collections from the command line
---

# CLI

`@piqit/cli` ships a `piq` binary for querying collections from the command line. It exists so that agents and scripts can pull specific fields from a document collection on demand, instead of maintaining index files or improvising extraction scripts.

Requires the Bun runtime.

## Setup

```bash
npm install @piqit/cli
```

Declare collections in a `piq.config.ts` at the root of your project. The CLI finds the nearest config by walking up from the working directory, and resolves relative `base` paths against the config's directory.

```typescript
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

## Discovering Collections

`piq` with no arguments lists collections and their queryable fields. `piq <collection> --schema` shows one collection.

```
$ piq posts --schema
posts
  scan:   year, slug
  filter: title, status
  select: params.year, params.slug, frontmatter.title, frontmatter.status
```

Filter fields are listed when the frontmatter schema is a Zod object; other schemas fall back to `frontmatter.*`.

## Querying

Flags mirror the query builder stages directly.

```bash
piq posts \
  --scan year=2024 \
  --filter status=published \
  --sort params.slug:desc \
  --limit 5 \
  --select params.slug,frontmatter.title
```

| Flag | Builder equivalent | Notes |
| --- | --- | --- |
| `--scan k=v` | `.scan({ k: 'v' })` | Repeatable |
| `--filter k=v` | `.filter({ k: v })` | Repeatable; `true`, `false`, `null`, and numbers are coerced |
| `--filter k~=v` | `.filter({ k: { contains: v } })` | Substring match, case-sensitive |
| `--select a,b` | `.select('a', 'b')` | Required |
| `--sort path:desc` | `.sort('path', 'desc')` | Repeatable; direction defaults to `asc` |
| `--limit n` | `.limit(n)` | Applied after sort |

## Output

A constrained query returning zero rows prints a reminder to stderr that `--scan` and `--filter` match exactly, pointing at `~=` for substring matching.

Rows print as JSON lines by default, one object per line, so results pipe cleanly into `jq` or another process. `--json` prints a single array. `--table` prints aligned columns for reading in a terminal.

```
$ piq posts --select params.slug,frontmatter.status --table
slug         status
----         ------
first-note   published
second-note  draft
```

## Use With Agents

A single line in your agent instructions replaces hand-maintained index files:

> Query this repo's document collections with `piq`. Run `piq` to list collections and `piq <name> --schema` to see fields.

The agent selects only the fields it needs, which keeps large document bodies out of its context.
