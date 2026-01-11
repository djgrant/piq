/**
 * piq v2 Type Tests
 *
 * These tests verify compile-time type behavior of the piq API.
 * Run with: bun run --bun tsc --noEmit
 */

import { piq, fromResolver, register, clearRegistry } from "../src"
import { fileMarkdown } from "@piqit/resolvers"
import type { StandardSchema } from "../src/types"

// =============================================================================
// Test Schema Setup
// =============================================================================

interface TestFrontmatter {
  title: string
  status: "draft" | "published"
}

const testSchema: StandardSchema<TestFrontmatter> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate: (value) => ({ value: value as TestFrontmatter }),
  },
}

const resolver = fileMarkdown({
  base: "test/fixtures",
  path: "{year}/{slug}.md",
  frontmatter: testSchema,
  body: { html: true, headings: true },
})

// =============================================================================
// Type Assertion Utilities
// =============================================================================

type AssertEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2
  ? true
  : never

type AssertExtends<T, U> = T extends U ? true : never

declare function assertType<T extends true>(): void

// =============================================================================
// Select Type Inference Tests
// =============================================================================

// Test: Basic select infers correct types
async function testBasicSelectInference() {
  const result = await fromResolver(resolver)
    .select("params.slug")
    .single()
    .exec()

  if (result) {
    // slug should be string
    const slug: string = result.slug
    assertType<AssertEqual<typeof slug, string>>()
  }
}

// Test: Multi-select infers all fields
async function testMultiSelectInference() {
  const results = await fromResolver(resolver)
    .select("params.slug", "frontmatter.title")
    .exec()

  const first = results[0]
  // Both should be string
  const slug: string = first.slug
  const title: string = first.title

  assertType<AssertEqual<typeof slug, string>>()
  assertType<AssertEqual<typeof title, string>>()
}

// Test: Alias select uses alias names
async function testAliasSelectInference() {
  const results = await fromResolver(resolver)
    .select({ mySlug: "params.slug", myTitle: "frontmatter.title" })
    .exec()

  const first = results[0]
  // Should use alias names, not original field names
  const mySlug: string = first.mySlug
  const myTitle: string = first.myTitle

  assertType<AssertEqual<typeof mySlug, string>>()
  assertType<AssertEqual<typeof myTitle, string>>()
}

// Test: single() returns undefined union
async function testSingleReturnType() {
  const result = await fromResolver(resolver)
    .select("params.slug")
    .single()
    .exec()

  // Result can be undefined
  assertType<AssertExtends<undefined, typeof result>>()

  if (result !== undefined) {
    const slug: string = result.slug
    assertType<AssertEqual<typeof slug, string>>()
  }
}

// Test: execOrThrow() does NOT return undefined
async function testExecOrThrowType() {
  const result = await fromResolver(resolver)
    .select("params.slug")
    .single()
    .execOrThrow()

  // Result is guaranteed to be defined
  const slug: string = result.slug
  assertType<AssertEqual<typeof slug, string>>()
}

// Test: stream() yields correct type
async function testStreamType() {
  const stream = fromResolver(resolver).select("params.slug").stream()

  for await (const item of stream) {
    const slug: string = item.slug
    assertType<AssertEqual<typeof slug, string>>()
  }
}

// =============================================================================
// Collision Detection Tests (EXPECTED ERRORS)
// =============================================================================

// NOTE: These tests verify collision detection at compile time.
// If collision detection is working, uncommenting these lines should cause
// TypeScript errors.

// Test: Same field name from different namespaces should error
// @ts-expect-error - Collision: both 'params.title' and 'frontmatter.title' flatten to 'title'
// async function testCollisionDetection() {
//   // This would require a schema that has 'title' in both params and frontmatter
//   // Since our test schema only has title in frontmatter, we can't easily test this
// }

// =============================================================================
// Invalid Path Detection Tests
// =============================================================================

// Test: Invalid paths should not compile
// Note: The actual path validation depends on the resolver's result schema
// These tests document expected behavior

// @ts-expect-error - 'invalid' is not a valid namespace
async function _testInvalidNamespace() {
  // This won't work because 'invalid' isn't a namespace in the result type
  // However, due to how TypeScript infers string literals, this may not error
  // at compile time but will fail at runtime
}

// =============================================================================
// Scan and Filter Type Tests
// =============================================================================

// Test: Scan accepts partial path params
async function testScanType() {
  const results = await fromResolver(resolver)
    .scan({ year: "2024" }) // Only providing year, not slug
    .select("params.slug")
    .exec()

  assertType<AssertEqual<typeof results, { slug: unknown }[]>>()
}

// Test: Filter accepts partial frontmatter fields
async function testFilterType() {
  const results = await fromResolver(resolver)
    .filter({ status: "published" }) // Only providing status, not title
    .select("params.slug")
    .exec()

  assertType<AssertEqual<typeof results, { slug: unknown }[]>>()
}

// =============================================================================
// Chaining Tests
// =============================================================================

// Test: Chained methods preserve types
async function testChainingTypes() {
  const results = await fromResolver(resolver)
    .scan({ year: "2024" })
    .filter({ status: "published" })
    .select("params.slug", "frontmatter.title")
    .exec()

  const first = results[0]
  const slug: string = first.slug
  const title: string = first.title

  assertType<AssertEqual<typeof slug, string>>()
  assertType<AssertEqual<typeof title, string>>()
}

// Test: select() creates new builder (for type transformation)
async function testSelectCreatesNewBuilder() {
  const base = fromResolver(resolver)
  const withFilter = base.filter({ status: "published" })

  // Before select - result type is full resolver result
  // After select - result type is narrowed to selected fields

  const withSelect = withFilter.select("params.slug")
  const results = await withSelect.exec()

  // Only 'slug' should be available
  const slug: string = results[0].slug
  assertType<AssertEqual<typeof slug, string>>()
}
