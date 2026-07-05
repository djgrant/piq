---
title: '@piqit/resolvers'
description: Resolver package for filesystem and static content query sources
---

# `@piqit/resolvers`

`@piqit/resolvers` exports resolver factories and parsing utilities for filesystem-backed and precompiled content sources.

## Install

```bash
npm install @piqit/resolvers
```

## Imports

```typescript
import { fileMarkdown, staticContent, staticResolver } from '@piqit/resolvers'
import { staticContent as edgeStaticContent } from '@piqit/resolvers/edge'
```

## Exports

### Resolver factories

- `fileMarkdown(options)`
- `staticContent(data)`
- `staticResolver` (alias)

### Utility APIs

- Path patterns: `compilePattern`, `createParamsSchema`
- Frontmatter: `parseFrontmatter`, `readFrontmatter`, `readFrontmatterWithOffset`
- Markdown: `parseMarkdownBody`, `extractHeadings`, `slugify`, `markdownToHtml`

## `fileMarkdown`

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

- Bun runtime required.
- Scan values come from path placeholders.
- Filter checks frontmatter equality.

## `staticContent`

```typescript
const postsResolver = staticContent(precompiledPosts)
```

- No filesystem dependency.
- Intended for edge and other runtime-safe execution environments.

## Build/Check (Workspace)

```bash
bun run --filter @piqit/resolvers build
bun run --filter @piqit/resolvers check
```
