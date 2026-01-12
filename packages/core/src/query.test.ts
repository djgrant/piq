/**
 * piq v2 Query Builder Tests
 */

import { describe, test, expect, beforeEach } from "bun:test"
import {
  piq,
  QueryBuilder,
  from,
  undot,
  undotWithAliases,
  expandWildcards,
  type Resolver,
  type StandardSchema,
} from "./index"

// =============================================================================
// Mock Schema Helper
// =============================================================================

/** Create a simple StandardSchema for testing */
function createSchema<T>(): StandardSchema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: value as T }),
    },
  }
}

// =============================================================================
// Mock Resolver
// =============================================================================

type MockScan = { pattern: string }
type MockFilter = { draft?: boolean }
type MockResult = {
  params: { slug: string; year: string }
  frontmatter: { title: string; draft: boolean; tags: string[] }
  body: { content: string }
}

const mockData: MockResult[] = [
  {
    params: { slug: "hello-world", year: "2024" },
    frontmatter: { title: "Hello World", draft: false, tags: ["intro"] },
    body: { content: "Welcome to my blog" },
  },
  {
    params: { slug: "second-post", year: "2024" },
    frontmatter: { title: "Second Post", draft: true, tags: ["update"] },
    body: { content: "This is another post" },
  },
  {
    params: { slug: "third-post", year: "2025" },
    frontmatter: { title: "Third Post", draft: false, tags: ["news"] },
    body: { content: "Latest news" },
  },
]

function createMockResolver(): Resolver<
  StandardSchema<MockScan>,
  StandardSchema<MockFilter>,
  StandardSchema<MockResult>
> {
  return {
    schema: {
      scanParams: createSchema<MockScan>(),
      filterParams: createSchema<MockFilter>(),
      result: createSchema<MockResult>(),
    },
    async resolve(spec) {
      let results = [...mockData]

      // Apply filter
      if (spec.filter?.draft !== undefined) {
        results = results.filter((r) => r.frontmatter.draft === spec.filter!.draft)
      }

      // Return partial results based on select
      return results.map((r) => {
        const partial: Partial<MockResult> = {}
        for (const path of spec.select) {
          if (path.startsWith("params.")) {
            partial.params = r.params
          } else if (path.startsWith("frontmatter.")) {
            partial.frontmatter = r.frontmatter
          } else if (path.startsWith("body.")) {
            partial.body = r.body
          }
        }
        return partial
      })
    },
  }
}



// =============================================================================
// Undot Tests
// =============================================================================

describe("undot", () => {
  const sampleResult: MockResult = {
    params: { slug: "hello", year: "2024" },
    frontmatter: { title: "Hello World", draft: false, tags: ["a", "b"] },
    body: { content: "Test content" },
  }

  test("extracts single field", () => {
    const result = undot(sampleResult, ["params.slug"])
    expect(result).toEqual({ slug: "hello" })
  })

  test("extracts multiple fields", () => {
    const result = undot(sampleResult, ["params.slug", "frontmatter.title"])
    expect(result).toEqual({ slug: "hello", title: "Hello World" })
  })

  test("extracts fields from different namespaces", () => {
    const result = undot(sampleResult, [
      "params.year",
      "frontmatter.draft",
      "body.content",
    ])
    expect(result).toEqual({
      year: "2024",
      draft: false,
      content: "Test content",
    })
  })

  test("handles array values", () => {
    const result = undot(sampleResult, ["frontmatter.tags"])
    expect(result).toEqual({ tags: ["a", "b"] })
  })
})

describe("undotWithAliases", () => {
  const sampleResult: MockResult = {
    params: { slug: "hello", year: "2024" },
    frontmatter: { title: "Hello World", draft: false, tags: ["a"] },
    body: { content: "Test" },
  }

  test("uses alias as property name", () => {
    const result = undotWithAliases(sampleResult, {
      mySlug: "params.slug",
    })
    expect(result).toEqual({ mySlug: "hello" })
  })

  test("handles multiple aliases", () => {
    const result = undotWithAliases(sampleResult, {
      postSlug: "params.slug",
      postTitle: "frontmatter.title",
      postContent: "body.content",
    })
    expect(result).toEqual({
      postSlug: "hello",
      postTitle: "Hello World",
      postContent: "Test",
    })
  })
})

describe("expandWildcards", () => {
  const namespaces = {
    params: { slug: "hello", year: "2024" },
    frontmatter: { title: "Test", draft: false },
  }

  test("expands wildcard to all fields", () => {
    const result = expandWildcards(["params.*"], namespaces)
    expect(result).toContain("params.slug")
    expect(result).toContain("params.year")
    expect(result).toHaveLength(2)
  })

  test("preserves non-wildcard paths", () => {
    const result = expandWildcards(["frontmatter.title"], namespaces)
    expect(result).toEqual(["frontmatter.title"])
  })

  test("handles mix of wildcards and regular paths", () => {
    const result = expandWildcards(["params.*", "frontmatter.title"], namespaces)
    expect(result).toContain("params.slug")
    expect(result).toContain("params.year")
    expect(result).toContain("frontmatter.title")
    expect(result).toHaveLength(3)
  })

  test("handles missing namespace gracefully", () => {
    const result = expandWildcards(["missing.*"], namespaces)
    expect(result).toEqual([])
  })
})

describe("undot with wildcards", () => {
  const sampleResult = {
    params: { slug: "hello", year: "2024" },
    frontmatter: { title: "Test" },
  }

  test("expands and undots wildcard paths", () => {
    const result = undot(sampleResult, ["params.*"])
    expect(result).toEqual({ slug: "hello", year: "2024" })
  })

  test("combines wildcard and regular paths", () => {
    const result = undot(sampleResult, ["params.*", "frontmatter.title"])
    expect(result).toEqual({ slug: "hello", year: "2024", title: "Test" })
  })
})

// =============================================================================
// QueryBuilder Tests
// =============================================================================

describe("QueryBuilder", () => {
  let resolver: ReturnType<typeof createMockResolver>

  beforeEach(() => {
    resolver = createMockResolver()
  })

  test("creates query from resolver", () => {
    const query = from(resolver)
    expect(query).toBeInstanceOf(QueryBuilder)
  })

  test("exec returns undotted results", async () => {
    const query = from(resolver)
    const results = await query.select("params.slug", "frontmatter.title").exec()

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({ slug: "hello-world", title: "Hello World" })
    expect(results[1]).toEqual({ slug: "second-post", title: "Second Post" })
    expect(results[2]).toEqual({ slug: "third-post", title: "Third Post" })
  })

  test("filter constrains results", async () => {
    const query = from(resolver)
    const results = await query
      .filter({ draft: false })
      .select("params.slug")
      .exec()

    expect(results).toHaveLength(2)
    expect(results.map((r) => r.slug)).toEqual(["hello-world", "third-post"])
  })

  test("select with aliases", async () => {
    const query = from(resolver)
    const results = await query
      .select({
        postSlug: "params.slug",
        postTitle: "frontmatter.title",
      })
      .exec()

    expect(results).toHaveLength(3)
    expect(results[0]).toEqual({
      postSlug: "hello-world",
      postTitle: "Hello World",
    })
  })

  test("single returns first result", async () => {
    const query = from(resolver)
    const result = await query.select("params.slug").single().exec()

    expect(result).toEqual({ slug: "hello-world" })
  })

  test("single returns undefined for empty results", async () => {
    // Create resolver that returns empty array
    const emptyResolver: Resolver<
      StandardSchema<{}>,
      StandardSchema<{}>,
      StandardSchema<{ params: { slug: string } }>
    > = {
      schema: {
        scanParams: createSchema<{}>(),
        filterParams: createSchema<{}>(),
        result: createSchema<{ params: { slug: string } }>(),
      },
      async resolve() {
        return []
      },
    }

    const result = await from(emptyResolver)
      .select("params.slug")
      .single()
      .exec()

    expect(result).toBeUndefined()
  })

  test("single().execOrThrow throws for empty results", async () => {
    const emptyResolver: Resolver<
      StandardSchema<{}>,
      StandardSchema<{}>,
      StandardSchema<{ params: { slug: string } }>
    > = {
      schema: {
        scanParams: createSchema<{}>(),
        filterParams: createSchema<{}>(),
        result: createSchema<{ params: { slug: string } }>(),
      },
      async resolve() {
        return []
      },
    }

    await expect(
      from(emptyResolver).select("params.slug").single().execOrThrow()
    ).rejects.toThrow("Query returned no results")
  })

  test("stream yields results one at a time", async () => {
    const query = from(resolver)
    const stream = query.filter({ draft: false }).select("params.slug").stream()

    const results: { slug: string }[] = []
    for await (const result of stream) {
      results.push(result)
    }

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({ slug: "hello-world" })
    expect(results[1]).toEqual({ slug: "third-post" })
  })

  test("select creates new builder for immutability", async () => {
    const base = from(resolver)
    const withFilter = base.filter({ draft: false })
    const withSelect = withFilter.select("params.slug")

    // filter() returns 'this' for chaining (same instance)
    expect(base).toBe(withFilter)

    // select() creates a NEW builder (different instance)
    // This is important so you can branch queries
    expect(withFilter).not.toBe(withSelect)
  })
})

// =============================================================================
// piq API Tests
// =============================================================================

describe("piq API", () => {
  test("piq.from accepts resolver directly", async () => {
    const resolver = createMockResolver()

    const results = await piq.from(resolver)
      .select("params.slug")
      .exec()

    expect(results).toHaveLength(3)
  })
})

// =============================================================================
// Error Cases
// =============================================================================

describe("Error handling", () => {
  test("throws when no select specified", async () => {
    const resolver = createMockResolver()
    const query = from(resolver)

    await expect(query.exec()).rejects.toThrow("No select specified")
  })
})
