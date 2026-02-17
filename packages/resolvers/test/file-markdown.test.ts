import { describe, test, expect, beforeAll } from "bun:test"
import { fileMarkdown } from "../src/file-markdown"
import { compilePattern } from "../src/path-pattern"
import { parseFrontmatter, readFrontmatter } from "../src/frontmatter"
import { parseMarkdownBody, extractHeadings, slugify } from "../src/markdown"
import type { StandardSchema } from "piqit"
import path from "node:path"

// =============================================================================
// Test Fixtures Path
// =============================================================================

const FIXTURES_PATH = path.join(import.meta.dir, "fixtures/posts")

// =============================================================================
// Simple Schema for Testing
// =============================================================================

interface PostFrontmatter {
  title: string
  status: "draft" | "published"
  tags: string[]
  date: string
}

const postFrontmatterSchema: StandardSchema<PostFrontmatter> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate(value: unknown) {
      if (value === null || typeof value !== "object") {
        return { issues: [{ message: "Expected object" }] }
      }
      const obj = value as Record<string, unknown>
      if (typeof obj.title !== "string") {
        return { issues: [{ message: "title must be string" }] }
      }
      if (obj.status !== "draft" && obj.status !== "published") {
        return { issues: [{ message: "status must be draft or published" }] }
      }
      return { value: obj as PostFrontmatter }
    },
  },
}

// =============================================================================
// Path Pattern Tests
// =============================================================================

describe("compilePattern", () => {
  test("extracts param names", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.paramNames).toEqual(["year", "slug"])
  })

  test("generates glob with no constraints", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.toGlob()).toBe("*/*.md")
  })

  test("generates glob with partial constraints", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.toGlob({ year: "2024" })).toBe("2024/*.md")
  })

  test("generates glob with full constraints", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.toGlob({ year: "2024", slug: "hello" })).toBe("2024/hello.md")
  })

  test("matches path and extracts params", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    const params = pattern.match("2024/hello-world.md")
    expect(params).toEqual({ year: "2024", slug: "hello-world" })
  })

  test("returns null for non-matching path", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.match("invalid")).toBeNull()
    expect(pattern.match("2024/nested/path.md")).toBeNull()
  })

  test("builds path from params", () => {
    const pattern = compilePattern("{year}/{slug}.md")
    expect(pattern.build({ year: "2024", slug: "hello" })).toBe("2024/hello.md")
  })

  test("handles complex patterns", () => {
    const pattern = compilePattern("{category}/{year}-{month}/{slug}.md")
    expect(pattern.paramNames).toEqual(["category", "year", "month", "slug"])
    expect(pattern.toGlob()).toBe("*/*-*/*.md")
    expect(pattern.match("tech/2024-01/my-post.md")).toEqual({
      category: "tech",
      year: "2024",
      month: "01",
      slug: "my-post",
    })
  })

  test("matches multi-param filenames with hyphenated trailing value", () => {
    const pattern = compilePattern("{status}/wp-{priority}-{name}.md")
    expect(pattern.match("todo/wp-1-build-feature.md")).toEqual({
      status: "todo",
      priority: "1",
      name: "build-feature",
    })
  })

  test("matches TASK-style filename params with hyphenated title", () => {
    const pattern = compilePattern("TASK-{num}-{title}.md")
    expect(pattern.match("TASK-123-title-which-may-include-hyphens.md")).toEqual({
      num: "123",
      title: "title-which-may-include-hyphens",
    })
  })
})

// =============================================================================
// Frontmatter Tests
// =============================================================================

describe("parseFrontmatter", () => {
  test("parses simple frontmatter", () => {
    const content = `---
title: Hello World
status: published
---

Body content here.`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      title: "Hello World",
      status: "published",
    })
  })

  test("parses arrays", () => {
    const content = `---
tags: [one, two, three]
---`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      tags: ["one", "two", "three"],
    })
  })

  test("parses quoted strings", () => {
    const content = `---
title: "Hello: World"
subtitle: 'Another value'
---`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      title: "Hello: World",
      subtitle: "Another value",
    })
  })

  test("parses booleans and nulls", () => {
    const content = `---
published: true
draft: false
deleted: null
---`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      published: true,
      draft: false,
      deleted: null,
    })
  })

  test("parses numbers", () => {
    const content = `---
count: 42
price: 9.99
---`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      count: 42,
      price: 9.99,
    })
  })

  test("returns null for content without frontmatter", () => {
    const content = "Just some text without frontmatter."
    expect(parseFrontmatter(content)).toBeNull()
  })
})

describe("readFrontmatter", () => {
  test("reads frontmatter from fixture file", async () => {
    const fm = await readFrontmatter(path.join(FIXTURES_PATH, "2024/hello-world.md"))
    expect(fm).not.toBeNull()
    expect(fm?.title).toBe("Hello World")
    expect(fm?.status).toBe("published")
  })
})

// =============================================================================
// Markdown Tests
// =============================================================================

describe("extractHeadings", () => {
  test("extracts headings with depth and slugs", () => {
    const markdown = `# Main Title

Some content.

## Section One

More content.

### Subsection

Even more.

## Section Two
`

    const headings = extractHeadings(markdown)
    expect(headings).toEqual([
      { depth: 1, text: "Main Title", slug: "main-title" },
      { depth: 2, text: "Section One", slug: "section-one" },
      { depth: 3, text: "Subsection", slug: "subsection" },
      { depth: 2, text: "Section Two", slug: "section-two" },
    ])
  })
})

describe("slugify", () => {
  test("converts text to slug", () => {
    expect(slugify("Hello World")).toBe("hello-world")
    expect(slugify("This is a TEST")).toBe("this-is-a-test")
    expect(slugify("Multiple   Spaces")).toBe("multiple-spaces")
    expect(slugify("Special!@#Characters")).toBe("specialcharacters")
  })
})

describe("parseMarkdownBody", () => {
  test("extracts raw markdown", () => {
    const content = `---
title: Test
---

# Hello

This is content.`

    const body = parseMarkdownBody(content, { raw: true })
    expect(body.raw).toBe("# Hello\n\nThis is content.")
  })

  test("converts to HTML", () => {
    const content = `---
title: Test
---

# Hello

This is **bold** text.`

    const body = parseMarkdownBody(content, { html: true })
    expect(body.html).toContain("<h1>Hello</h1>")
    expect(body.html).toContain("<strong>bold</strong>")
  })

  test("extracts headings", () => {
    const content = `---
title: Test
---

# Main

## Sub`

    const body = parseMarkdownBody(content, { headings: true })
    expect(body.headings).toEqual([
      { depth: 1, text: "Main", slug: "main" },
      { depth: 2, text: "Sub", slug: "sub" },
    ])
  })
})

// =============================================================================
// File Markdown Resolver Tests
// =============================================================================

describe("fileMarkdown resolver", () => {
  const resolver = fileMarkdown({
    base: FIXTURES_PATH,
    path: "{year}/{slug}.md",
    frontmatter: postFrontmatterSchema,
    body: { html: true, headings: true },
  })

  test("has correct schema structure", () => {
    expect(resolver.schema).toBeDefined()
    expect(resolver.schema.scanParams).toBeDefined()
    expect(resolver.schema.filterParams).toBeDefined()
    expect(resolver.schema.result).toBeDefined()
  })

  test("finds all files with wildcard scan", async () => {
    const results = await resolver.resolve({
      select: ["params.slug", "params.year"],
    })

    expect(results.length).toBe(3)

    const slugs = results.map((r) => r.params?.slug).sort()
    expect(slugs).toEqual(["draft-post", "hello-world", "old-post"])
  })

  test("filters by scan constraint (year)", async () => {
    const results = await resolver.resolve({
      scan: { year: "2024" },
      select: ["params.slug"],
    })

    expect(results.length).toBe(2)

    const slugs = results.map((r) => r.params?.slug).sort()
    expect(slugs).toEqual(["draft-post", "hello-world"])
  })

  test("filters by frontmatter constraint", async () => {
    const results = await resolver.resolve({
      filter: { status: "published" },
      select: ["params.slug", "frontmatter.title"],
    })

    expect(results.length).toBe(2)

    const titles = results.map((r) => r.frontmatter?.title).sort()
    expect(titles).toEqual(["Hello World", "Old Post"])
  })

  test("combines scan and filter constraints", async () => {
    const results = await resolver.resolve({
      scan: { year: "2024" },
      filter: { status: "published" },
      select: ["params.slug", "frontmatter.title"],
    })

    expect(results.length).toBe(1)
    expect(results[0].params?.slug).toBe("hello-world")
    expect(results[0].frontmatter?.title).toBe("Hello World")
  })

  test("selects frontmatter fields", async () => {
    const results = await resolver.resolve({
      filter: { status: "published" },
      select: ["frontmatter.title", "frontmatter.status"],
    })

    expect(results.length).toBe(2)

    for (const result of results) {
      expect(result.frontmatter?.title).toBeDefined()
      expect(result.frontmatter?.status).toBe("published")
    }
  })

  test("selects body.html", async () => {
    const results = await resolver.resolve({
      scan: { year: "2024", slug: "hello-world" },
      select: ["body.html"],
    })

    expect(results.length).toBe(1)
    expect(results[0].body?.html).toContain("<h1>Welcome to My Blog</h1>")
  })

  test("selects body.headings", async () => {
    const results = await resolver.resolve({
      scan: { year: "2024", slug: "hello-world" },
      select: ["body.headings"],
    })

    expect(results.length).toBe(1)
    expect(results[0].body?.headings).toBeDefined()
    expect(results[0].body?.headings?.length).toBeGreaterThan(0)
    expect(results[0].body?.headings?.[0]).toEqual({
      depth: 1,
      text: "Welcome to My Blog",
      slug: "welcome-to-my-blog",
    })
  })

  test("only reads what is selected", async () => {
    // When only selecting params, body and frontmatter shouldn't be in result
    const results = await resolver.resolve({
      select: ["params.year", "params.slug"],
    })

    expect(results.length).toBe(3)

    for (const result of results) {
      expect(result.params).toBeDefined()
      // frontmatter and body should not be present when not selected
      expect(result.frontmatter).toBeUndefined()
      expect(result.body).toBeUndefined()
    }
  })

  test("returns partial results based on select", async () => {
    const results = await resolver.resolve({
      scan: { year: "2023" },
      select: ["params.slug", "frontmatter.title"],
    })

    expect(results.length).toBe(1)
    expect(results[0].params?.slug).toBe("old-post")
    expect(results[0].frontmatter?.title).toBe("Old Post")
    // body should not be included
    expect(results[0].body).toBeUndefined()
  })
})

// =============================================================================
// Integration: Resolver with QuerySpec
// =============================================================================

describe("resolver with full query spec", () => {
  const resolver = fileMarkdown({
    base: FIXTURES_PATH,
    path: "{year}/{slug}.md",
    frontmatter: postFrontmatterSchema,
    body: { raw: true, html: true, headings: true },
  })

  test("complex query with all features", async () => {
    const results = await resolver.resolve({
      scan: { year: "2024" },
      filter: { status: "published" },
      select: [
        "params.year",
        "params.slug",
        "frontmatter.title",
        "frontmatter.tags",
        "body.headings",
      ],
    })

    expect(results.length).toBe(1)

    const post = results[0]
    expect(post.params?.year).toBe("2024")
    expect(post.params?.slug).toBe("hello-world")
    expect(post.frontmatter?.title).toBe("Hello World")
    expect(post.frontmatter?.tags).toEqual(["intro", "tutorial"])
    expect(post.body?.headings).toBeDefined()
    expect(post.body?.headings?.[0].text).toBe("Welcome to My Blog")
  })
})
