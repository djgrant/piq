---
title: Concepts
description: Core concepts and design principles behind piq
---

# Concepts

piq's design is built around a few core ideas. Understanding these will help you 
get the most out of the library.

## Cost-Awareness

The API makes resolution cost visible. The layers aren't implementation detail—they're 
the API contract.

When you call `.scan()`, you're doing path enumeration. It's cheap—no file 
contents are read. When you call `.filter()`, you're reading frontmatter from 
each file that passed the scan. When you `.select()` body fields, you're 
parsing markdown.

This is explicit by design. You know what you're paying for.

## Design Patterns Upfront

Like DynamoDB, piq rewards designing your access patterns into your data structure. 
The query harvests structure created at write time.

```typescript
// Good: year in path, filterable without I/O
fileMarkdown({ path: '{year}/{slug}.md' })
piq.from('posts').scan({ year: '2024' })  // Fast - just glob pattern

// Less efficient: year only in frontmatter
piq.from('posts').scan({}).filter({ year: '2024' })  // Must read every file
```

Put high-cardinality, frequently-filtered fields in your path pattern where enumeration 
can extract them for free.

## Flat Results

Select uses dotted paths, but results are flat. The final segment of each path becomes 
the property name:

```typescript
.select('params.slug', 'frontmatter.title', 'body.html')
// Result: { slug: string; title: string; html: string }
```

If you need custom names or have collisions, use the object form:

```typescript
.select({
  postSlug: 'params.slug',
  postTitle: 'frontmatter.title'
})
// Result: { postSlug: string; postTitle: string }
```

## Relationships

piq doesn't do joins. Relationships are your responsibility.

Fetching a post then its author is one waterfall—acceptable:

```typescript
const post = await getPost(slug)
const author = await getAuthor(post.authorId)
```

Fetching 100 posts then 100 separate author queries is N+1—restructure or batch:

```typescript
// Bad: N+1
for (const post of posts) {
  const author = await getAuthor(post.authorId)
}

// Better: batch fetch authors
const authorIds = posts.map(p => p.authorId)
const authors = await getAuthors(authorIds)
```

## Type Safety

Invalid queries are type errors, not runtime surprises. TypeScript catches:

- Selecting fields that don't exist
- Filtering on non-existent frontmatter properties
- Scanning with invalid path parameters
- Collision detection when two paths have the same final segment

```typescript
// ERROR: 'title' appears in both paths
.select('params.title', 'frontmatter.title')

// FIX: use object form to alias
.select({ paramTitle: 'params.title', fmTitle: 'frontmatter.title' })
```
