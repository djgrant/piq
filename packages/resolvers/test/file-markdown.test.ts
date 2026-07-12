import { describe, test, expect } from "bun:test"
import { fileMarkdown } from "../src/file-markdown"
import { compilePattern } from "../src/path-pattern"
import { parseFrontmatter, parseFrontmatterStrict, readFrontmatter } from "../src/frontmatter"
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

  test("optional segment params are extracted when present, omitted when absent", () => {
    const pattern = compilePattern("{date}< {time}> - {slug}.md")
    expect(pattern.paramNames).toEqual(["date", "time", "slug"])
    expect(pattern.match("2024-01-05 09-30-00 - hello.md")).toEqual({
      date: "2024-01-05",
      time: "09-30-00",
      slug: "hello",
    })
    expect(pattern.match("2024-01-05 - hello.md")).toEqual({
      date: "2024-01-05",
      slug: "hello",
    })
  })

  test("toGlobs enumerates optional segment variants", () => {
    const pattern = compilePattern("{date}< {time}> - {slug}.md")
    expect(pattern.toGlobs().sort()).toEqual(["* * - *.md", "* - *.md"])
  })

  test("toGlobs prunes variants that omit a constrained param", () => {
    const pattern = compilePattern("{date}< {time}> - {slug}.md")
    expect(pattern.toGlobs({ time: "09-30-00" })).toEqual(["* 09-30-00 - *.md"])
  })

  test("toGlob throws when optional segments produce multiple variants", () => {
    const pattern = compilePattern("{date}< {time}> - {slug}.md")
    expect(() => pattern.toGlob()).toThrow("toGlobs()")
  })

  test("build omits optional segment when its params are missing", () => {
    const pattern = compilePattern("{date}< {time}> - {slug}.md")
    expect(pattern.build({ date: "2024-01-05", slug: "hello" })).toBe(
      "2024-01-05 - hello.md"
    )
    expect(pattern.build({ date: "2024-01-05", time: "09-30-00", slug: "hello" })).toBe(
      "2024-01-05 09-30-00 - hello.md"
    )
  })

  test("escapes glob special characters in literals and constrained values", () => {
    const pattern = compilePattern("{date} - {from} [{id}].md")
    expect(pattern.toGlobs()).toEqual(["* - * \\[*\\].md"])
    expect(pattern.match("2024-01-05 - alice [abc123].md")).toEqual({
      date: "2024-01-05",
      from: "alice",
      id: "abc123",
    })
  })

  test("rejects unclosed and nested optional segments", () => {
    expect(() => compilePattern("{date}< {time} - {slug}.md")).toThrow("Unclosed")
    expect(() => compilePattern("{a}<b<c>>.md")).toThrow("Nested")
  })

  test("matches TASK-style filename params with hyphenated title", () => {
    const pattern = compilePattern("TASK-{num}-{title}.md")
    expect(pattern.match("TASK-123-title-which-may-include-hyphens.md")).toEqual({
      num: "123",
      title: "title-which-may-include-hyphens",
    })
  })

  test("supports constrained params with inline token regex", () => {
    const pattern = compilePattern("TASK-{num:\\d+}-{slug}.md")

    expect(pattern.match("TASK-003-reject-blank-titles-in-create-command.md")).toEqual({
      num: "003",
      slug: "reject-blank-titles-in-create-command",
    })
    expect(pattern.match("TASK-abc-reject-blank-titles-in-create-command.md")).toBeNull()
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

  test("parses block arrays with indentation", () => {
    const content = `---
tags:
  - one
  - two
  - three
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

  test("parses multiline blocks with preserved indentation", () => {
    const content = `---
summary: |
  first line
    indented line
  final line

status: published
---`

    const fm = parseFrontmatter(content)
    expect(fm).toEqual({
      summary: "first line\n  indented line\nfinal line\n",
      status: "published",
    })
  })

  test("parses CRLF frontmatter", () => {
    const content = "---\r\ntitle: Hello\r\nstatus: published\r\n---\r\n\r\nBody"
    const fm = parseFrontmatter(content)

    expect(fm).toEqual({
      title: "Hello",
      status: "published",
    })
  })
})

describe("parseFrontmatterStrict", () => {
  test("throws when opening fence is not closed", () => {
    expect(() => parseFrontmatterStrict("---\ntitle: test\nbody: value")).toThrow(
      "opening frontmatter fence is not closed"
    )
  })

  test("throws when fence appears after non-frontmatter content", () => {
    expect(() => parseFrontmatterStrict("Hello\n---\ntitle: test\n---\n")).toThrow(
      "frontmatter fence found after non-frontmatter content"
    )
  })

  test("throws when opening fence is not followed by newline", () => {
    expect(() => parseFrontmatterStrict("---title: test\n---\n")).toThrow(
      "opening frontmatter fence must be followed by a newline"
    )
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

// =============================================================================
// Optional Path Segments (integration)
// =============================================================================

describe("fileMarkdown with optional path segments", () => {
  interface MessageFrontmatter {
    from: string
    subject: string
    summary: string
  }

  const messageSchema: StandardSchema<MessageFrontmatter> = {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: value as MessageFrontmatter }),
    },
  }

  const resolver = fileMarkdown({
    base: path.join(import.meta.dir, "fixtures/messages"),
    path: "{date}< {time}> - {from} - {subject} [{id}].md",
    frontmatter: messageSchema,
  })

  test("matches both timed and untimed filenames, deduped across glob variants", async () => {
    const results = await resolver.resolve({
      select: ["params.date", "params.time", "params.id"],
    })

    // 3 files on disk; broad and narrow glob variants must not double-count
    expect(results.length).toBe(3)

    const timed = results.filter((r) => r.params?.time !== undefined)
    expect(timed.length).toBe(2)
  })

  test("scan on a param verifies extracted values against over-matching globs", async () => {
    const results = await resolver.resolve({
      scan: { date: "2024-02-10" },
      select: ["params.id", "frontmatter.summary"],
    })

    expect(results.length).toBe(1)
    expect(results[0].params?.id).toBe("def456")
    expect(results[0].frontmatter?.summary).toBe(
      "Summary of the February retrospective."
    )
  })

  test("scan on optional param only matches files that include it", async () => {
    const results = await resolver.resolve({
      scan: { time: "09-30-00" },
      select: ["params.date", "params.time"],
    })

    expect(results.length).toBe(1)
    expect(results[0].params).toEqual({
      date: "2024-01-05",
      time: "09-30-00",
      from: "alice",
      subject: "Kickoff notes",
      id: "abc123",
    })
  })
})
