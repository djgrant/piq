/**
 * Type-level tests for piq v2 Select Type System
 *
 * These tests verify the type machinery works correctly at compile time.
 * Run with: bun run --bun tsc --noEmit
 */

import type {
  SelectablePaths,
  GetFieldName,
  GetPathValue,
  ExpandWildcard,
  HasCollision,
  Undot,
  UndotWithAliases,
  ExpandAllWildcards,
  ValidateSelect
} from "./select-types"

// =============================================================================
// Type Assertion Utilities
// =============================================================================

/**
 * Asserts two types are exactly equal.
 * If T and U are different, this will be `never`.
 */
type AssertEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U ? 1 : 2
  ? true
  : never

/**
 * Asserts T is assignable to U.
 */
type AssertExtends<T, U> = T extends U ? true : never

/**
 * Helper to consume type assertions (suppresses unused warnings).
 */
declare function assert<T extends true>(): void

// =============================================================================
// Test Schema
// =============================================================================

type TestSchema = {
  params: { slug: string; year: number }
  frontmatter: { title: string; tags: string[]; draft: boolean }
  body: { html: string; raw: string }
}

// =============================================================================
// SelectablePaths Tests
// =============================================================================

type Paths = SelectablePaths<TestSchema>

// Should include individual field paths
assert<AssertExtends<"params.slug", Paths>>()
assert<AssertExtends<"params.year", Paths>>()
assert<AssertExtends<"frontmatter.title", Paths>>()
assert<AssertExtends<"frontmatter.tags", Paths>>()
assert<AssertExtends<"frontmatter.draft", Paths>>()
assert<AssertExtends<"body.html", Paths>>()
assert<AssertExtends<"body.raw", Paths>>()

// Should include wildcard paths
assert<AssertExtends<"params.*", Paths>>()
assert<AssertExtends<"frontmatter.*", Paths>>()
assert<AssertExtends<"body.*", Paths>>()

// =============================================================================
// GetFieldName Tests
// =============================================================================

assert<AssertEqual<GetFieldName<"params.slug">, "slug">>()
assert<AssertEqual<GetFieldName<"frontmatter.title">, "title">>()
assert<AssertEqual<GetFieldName<"body.html">, "html">>()
assert<AssertEqual<GetFieldName<"params.*">, "*">>()

// =============================================================================
// GetPathValue Tests
// =============================================================================

assert<AssertEqual<GetPathValue<TestSchema, "params.slug">, string>>()
assert<AssertEqual<GetPathValue<TestSchema, "params.year">, number>>()
assert<AssertEqual<GetPathValue<TestSchema, "frontmatter.title">, string>>()
assert<AssertEqual<GetPathValue<TestSchema, "frontmatter.tags">, string[]>>()
assert<AssertEqual<GetPathValue<TestSchema, "frontmatter.draft">, boolean>>()
assert<AssertEqual<GetPathValue<TestSchema, "body.html">, string>>()

// Invalid paths should be never
assert<AssertEqual<GetPathValue<TestSchema, "invalid.path">, never>>()
assert<AssertEqual<GetPathValue<TestSchema, "params.invalid">, never>>()

// =============================================================================
// ExpandWildcard Tests
// =============================================================================

type ExpandedParams = ExpandWildcard<TestSchema, "params.*">
assert<AssertExtends<"params.slug", ExpandedParams>>()
assert<AssertExtends<"params.year", ExpandedParams>>()

type ExpandedFrontmatter = ExpandWildcard<TestSchema, "frontmatter.*">
assert<AssertExtends<"frontmatter.title", ExpandedFrontmatter>>()
assert<AssertExtends<"frontmatter.tags", ExpandedFrontmatter>>()
assert<AssertExtends<"frontmatter.draft", ExpandedFrontmatter>>()

// Non-wildcard passes through unchanged
assert<AssertEqual<ExpandWildcard<TestSchema, "params.slug">, "params.slug">>()

// =============================================================================
// HasCollision Tests
// =============================================================================

// No collision - different field names
assert<AssertEqual<HasCollision<["params.slug", "frontmatter.title"]>, false>>()
assert<AssertEqual<HasCollision<["params.slug", "params.year", "body.html"]>, false>>()

// Collision - same field name from different namespaces
assert<AssertEqual<HasCollision<["params.title", "frontmatter.title"]>, true>>()

// Edge cases
assert<AssertEqual<HasCollision<["params.slug"]>, false>>() // Single path
assert<AssertEqual<HasCollision<[]>, false>>() // Empty array

// =============================================================================
// Undot Tests
// =============================================================================

assert<AssertEqual<Undot<TestSchema, ["params.slug", "frontmatter.title"]>, { slug: string; title: string }>>()

assert<AssertEqual<
  Undot<TestSchema, ["params.slug", "params.year", "frontmatter.tags"]>,
  { slug: string; year: number; tags: string[] }
>>()

assert<AssertEqual<
  Undot<TestSchema, ["body.html", "frontmatter.draft"]>,
  { html: string; draft: boolean }
>>()

// =============================================================================
// UndotWithAliases Tests
// =============================================================================

assert<AssertEqual<
  UndotWithAliases<TestSchema, { postSlug: "params.slug"; postTitle: "frontmatter.title" }>,
  { postSlug: string; postTitle: string }
>>()

assert<AssertEqual<
  UndotWithAliases<TestSchema, { id: "params.slug"; publishYear: "params.year"; content: "body.html" }>,
  { id: string; publishYear: number; content: string }
>>()

// =============================================================================
// ExpandAllWildcards Tests
// =============================================================================

type ExpandedAll = ExpandAllWildcards<TestSchema, ["params.*", "frontmatter.title"]>
assert<AssertExtends<"params.slug", ExpandedAll>>()
assert<AssertExtends<"params.year", ExpandedAll>>()
assert<AssertExtends<"frontmatter.title", ExpandedAll>>()

// =============================================================================
// ValidateSelect Tests
// =============================================================================

// Valid - no collisions
assert<AssertEqual<ValidateSelect<["params.slug", "frontmatter.title"]>, ["params.slug", "frontmatter.title"]>>()

// Invalid - has collision, returns never
assert<AssertEqual<ValidateSelect<["params.title", "frontmatter.title"]>, never>>()

// =============================================================================
// Complex Integration Test
// =============================================================================

// Simulating a real query scenario
type BlogSchema = {
  params: { slug: string; category: string }
  frontmatter: { title: string; author: string; publishedAt: Date; tags: string[] }
  body: { html: string; excerpt: string }
}

// Verify SelectablePaths generates correct paths for BlogSchema
type BlogPaths = SelectablePaths<BlogSchema>
assert<AssertExtends<"params.slug", BlogPaths>>()
assert<AssertExtends<"params.category", BlogPaths>>()
assert<AssertExtends<"frontmatter.title", BlogPaths>>()
assert<AssertExtends<"frontmatter.author", BlogPaths>>()
assert<AssertExtends<"frontmatter.publishedAt", BlogPaths>>()
assert<AssertExtends<"frontmatter.tags", BlogPaths>>()
assert<AssertExtends<"body.html", BlogPaths>>()
assert<AssertExtends<"body.excerpt", BlogPaths>>()
assert<AssertExtends<"params.*", BlogPaths>>()
assert<AssertExtends<"frontmatter.*", BlogPaths>>()
assert<AssertExtends<"body.*", BlogPaths>>()

// This should work - no collisions
type BlogSelect = ["params.slug", "frontmatter.title", "frontmatter.author", "body.excerpt"]
assert<AssertEqual<
  Undot<BlogSchema, BlogSelect>,
  { slug: string; title: string; author: string; excerpt: string }
>>()

// With aliases to avoid collisions
assert<AssertEqual<
  UndotWithAliases<BlogSchema, {
    urlSlug: "params.slug"
    postTitle: "frontmatter.title"
    writerName: "frontmatter.author"
    summary: "body.excerpt"
  }>,
  { urlSlug: string; postTitle: string; writerName: string; summary: string }
>>()
