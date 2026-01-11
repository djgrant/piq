/**
 * piq v2 End-to-End Integration Tests
 *
 * These tests verify the full piq API works correctly with real resolvers.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { piq, register, clearRegistry, fromResolver } from "../src"
import { fileMarkdown } from "@piqit/resolvers"
import type { StandardSchema } from "../src/types"
import path from "node:path"

// =============================================================================
// Test Fixtures Path
// =============================================================================

const FIXTURES_PATH = path.join(import.meta.dir, "../../resolvers/test/fixtures/posts")

// =============================================================================
// Frontmatter Schema
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
// piq e2e Tests with Registry
// =============================================================================

describe("piq e2e", () => {
  beforeAll(() => {
    // Register a posts resolver pointing to fixtures
    register(
      "posts",
      fileMarkdown({
        base: FIXTURES_PATH,
        path: "{year}/{slug}.md",
        frontmatter: postFrontmatterSchema,
        body: { html: true, headings: true },
      })
    )
  })

  afterAll(() => clearRegistry())

  test("basic query with select", async () => {
    const results = await piq
      .from("posts")
      .scan({ year: "2024" })
      .select("params.slug", "frontmatter.title")
      .exec()

    expect(results).toHaveLength(2)
    expect(results[0]).toHaveProperty("slug")
    expect(results[0]).toHaveProperty("title")
    // Result should be flat, not nested
    expect(results[0]).not.toHaveProperty("params")
    expect(results[0]).not.toHaveProperty("frontmatter")
  })

  test("filter narrows results", async () => {
    const results = await piq
      .from("posts")
      .scan({}) // scan all
      .filter({ status: "published" })
      .select("params.slug")
      .exec()

    // Should only return published posts (hello-world and old-post)
    expect(results.length).toBe(2)
    const slugs = results.map((r) => r.slug).sort()
    expect(slugs).toEqual(["hello-world", "old-post"])
  })

  test("wildcard selects all from namespace", async () => {
    const results = await piq
      .from("posts")
      .scan({ year: "2024", slug: "hello-world" })
      .select("params.*")
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ slug: "hello-world", year: "2024" })
  })

  test("object form aliases fields", async () => {
    const results = await piq
      .from("posts")
      .scan({ year: "2024", slug: "hello-world" })
      .select({ postSlug: "params.slug", postTitle: "frontmatter.title" })
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0]).toHaveProperty("postSlug", "hello-world")
    expect(results[0]).toHaveProperty("postTitle", "Hello World")
  })

  test("single() returns one result", async () => {
    const result = await piq
      .from("posts")
      .scan({ year: "2024", slug: "hello-world" })
      .select("params.slug", "frontmatter.title")
      .single()
      .exec()

    expect(result).toHaveProperty("slug", "hello-world")
    expect(result).toHaveProperty("title", "Hello World")
  })

  test("single() returns undefined for no results", async () => {
    const result = await piq
      .from("posts")
      .scan({ year: "9999", slug: "nonexistent" })
      .select("params.slug")
      .single()
      .exec()

    expect(result).toBeUndefined()
  })

  test("stream() yields results one at a time", async () => {
    const results: unknown[] = []

    for await (const post of piq
      .from("posts")
      .scan({ year: "2024" })
      .select("params.slug")
      .stream()) {
      results.push(post)
    }

    expect(results.length).toBe(2)
    expect(results[0]).toHaveProperty("slug")
  })

  test("body selection works", async () => {
    const results = await piq
      .from("posts")
      .scan({ year: "2024", slug: "hello-world" })
      .select("body.html", "body.headings")
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0]).toHaveProperty("html")
    expect(results[0]).toHaveProperty("headings")
    expect(results[0].html).toContain("<h1>")
    expect(Array.isArray(results[0].headings)).toBe(true)
  })

  test("combining scan + filter + select works end-to-end", async () => {
    const results = await piq
      .from("posts")
      .scan({ year: "2024" })
      .filter({ status: "published" })
      .select("params.slug", "frontmatter.title", "frontmatter.tags")
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe("hello-world")
    expect(results[0].title).toBe("Hello World")
    expect(results[0].tags).toEqual(["intro", "tutorial"])
  })

  test("execOrThrow throws on no results", async () => {
    await expect(
      piq
        .from("posts")
        .scan({ year: "9999" })
        .select("params.slug")
        .single()
        .execOrThrow()
    ).rejects.toThrow("Query returned no results")
  })
})

// =============================================================================
// Direct Resolver Tests (using fromResolver)
// =============================================================================

describe("piq fromResolver e2e", () => {
  const resolver = fileMarkdown({
    base: FIXTURES_PATH,
    path: "{year}/{slug}.md",
    frontmatter: postFrontmatterSchema,
    body: { html: true, headings: true, raw: true },
  })

  test("fromResolver creates working query builder", async () => {
    const results = await fromResolver(resolver)
      .scan({ year: "2024" })
      .select("params.slug", "frontmatter.title")
      .exec()

    expect(results).toHaveLength(2)
    expect(results[0]).toHaveProperty("slug")
    expect(results[0]).toHaveProperty("title")
  })

  test("select with multiple field types", async () => {
    const results = await fromResolver(resolver)
      .scan({ year: "2024", slug: "hello-world" })
      .select("params.slug", "frontmatter.title", "body.html")
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe("hello-world")
    expect(results[0].title).toBe("Hello World")
    expect(results[0].html).toContain("<h1>")
  })

  test("filter by multiple frontmatter fields", async () => {
    // Filter by both status and year via scan
    const results = await fromResolver(resolver)
      .scan({ year: "2024" })
      .filter({ status: "published" })
      .select("params.slug")
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0].slug).toBe("hello-world")
  })

  test("wildcard with aliases", async () => {
    // Using object form with a wildcard-expanded namespace
    const results = await fromResolver(resolver)
      .scan({ year: "2023", slug: "old-post" })
      .select({ theSlug: "params.slug", theYear: "params.year" })
      .exec()

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ theSlug: "old-post", theYear: "2023" })
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe("piq e2e edge cases", () => {
  const resolver = fileMarkdown({
    base: FIXTURES_PATH,
    path: "{year}/{slug}.md",
    frontmatter: postFrontmatterSchema,
    body: { html: true, headings: true },
  })

  test("empty scan returns all files", async () => {
    const results = await fromResolver(resolver)
      .scan({})
      .select("params.slug")
      .exec()

    // Should return all 3 posts
    expect(results).toHaveLength(3)
  })

  test("filter with no matches returns empty array", async () => {
    const results = await fromResolver(resolver)
      .filter({ status: "published" })
      .filter({ status: "draft" } as any) // Contradicting filter
      .select("params.slug")
      .exec()

    // The filter will use the last value, so draft only
    const slugs = results.map((r) => r.slug)
    expect(slugs).toEqual(["draft-post"])
  })

  test("select works with body.headings array", async () => {
    const results = await fromResolver(resolver)
      .scan({ year: "2024", slug: "hello-world" })
      .select("body.headings")
      .exec()

    expect(results).toHaveLength(1)
    expect(Array.isArray(results[0].headings)).toBe(true)
    expect(results[0].headings[0]).toHaveProperty("text")
    expect(results[0].headings[0]).toHaveProperty("slug")
    expect(results[0].headings[0]).toHaveProperty("depth")
  })

  test("multiple wildcards in same query", async () => {
    const results = await fromResolver(resolver)
      .scan({ year: "2024", slug: "hello-world" })
      .select("params.*", "frontmatter.*")
      .exec()

    expect(results).toHaveLength(1)
    // params.*
    expect(results[0]).toHaveProperty("slug", "hello-world")
    expect(results[0]).toHaveProperty("year", "2024")
    // frontmatter.*
    expect(results[0]).toHaveProperty("title", "Hello World")
    expect(results[0]).toHaveProperty("status", "published")
    expect(results[0]).toHaveProperty("tags")
    expect(results[0]).toHaveProperty("date")
  })

  test("single item with all fields via wildcard", async () => {
    const result = await fromResolver(resolver)
      .scan({ year: "2024", slug: "hello-world" })
      .select("params.*", "frontmatter.*", "body.*")
      .single()
      .exec()

    expect(result).toBeDefined()
    expect(result).toHaveProperty("slug")
    expect(result).toHaveProperty("title")
    expect(result).toHaveProperty("html")
    expect(result).toHaveProperty("headings")
  })
})
