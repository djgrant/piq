/**
 * Static Content Resolver
 *
 * A resolver for querying pre-compiled content in edge environments
 * like Cloudflare Workers where filesystem access is not available.
 *
 * Content is compiled at build time and bundled as a static module.
 *
 * @example
 * // 1. Build script compiles content:
 * // build-content.ts
 * import { fileMarkdown } from "@piqit/resolvers";
 * const posts = fileMarkdown({ ... });
 * const allPosts = await posts.resolve({ scan: {}, filter: {}, select: ["params.*", "frontmatter.*", "body.*"] });
 * await Bun.write("src/generated/content.ts", `export const posts = ${JSON.stringify(allPosts)};`);
 *
 * // 2. Worker imports and uses static resolver:
 * // worker.ts
 * import { posts } from "./generated/content";
 * import { staticContent } from "@piqit/resolvers";
 * import { piq } from "piqit";
 *
 * const postsResolver = staticContent(posts);
 *
 * const results = await piq.from(postsResolver)
 *   .filter({ author: "John" })
 *   .select("params.slug", "frontmatter.title")
 *   .exec();
 */

import type { Resolver, StandardSchema } from "@piqit/core"

// =============================================================================
// Filter Helpers
// =============================================================================

/**
 * Get a nested value from an object using dot-path notation.
 */
function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Default filter implementation - checks equality on frontmatter fields.
 */
function defaultFilter<T>(item: T, filter: Partial<Record<string, unknown>>): boolean {
  const frontmatter = (item as Record<string, unknown>).frontmatter as Record<string, unknown> | undefined

  if (!frontmatter) {
    return Object.keys(filter).length === 0
  }

  for (const [key, value] of Object.entries(filter)) {
    if (frontmatter[key] !== value) {
      return false
    }
  }

  return true
}

/**
 * Check if scan constraints match params.
 */
function matchesScan<T>(item: T, scan: Partial<Record<string, unknown>>): boolean {
  const params = (item as Record<string, unknown>).params as Record<string, unknown> | undefined

  if (!params) {
    return Object.keys(scan).length === 0
  }

  for (const [key, value] of Object.entries(scan)) {
    if (value !== undefined && params[key] !== value) {
      return false
    }
  }

  return true
}

/**
 * Select specific fields from an item based on select paths.
 */
function selectFields<T extends object>(item: T, selectPaths: string[]): Partial<T> {
  const result: Record<string, unknown> = {}

  for (const path of selectPaths) {
    // Handle wildcards like "params.*"
    if (path.endsWith(".*")) {
      const namespace = path.slice(0, -2)
      const nsValue = getByPath(item, namespace)
      if (nsValue && typeof nsValue === "object") {
        result[namespace] = { ...nsValue as object }
      }
    } else {
      // Regular path like "params.slug" or "frontmatter.title"
      const parts = path.split(".")
      const namespace = parts[0]

      // Ensure namespace exists in result
      if (!result[namespace]) {
        result[namespace] = {}
      }

      // Set the value
      const value = getByPath(item, path)
      if (parts.length === 2) {
        (result[namespace] as Record<string, unknown>)[parts[1]] = value
      } else {
        // Deeper path - just copy the value
        result[namespace] = value
      }
    }
  }

  return result as Partial<T>
}

// =============================================================================
// Schema Factories
// =============================================================================

/**
 * Create a passthrough schema that accepts any value.
 * Used for static content where validation happened at build time.
 */
function createPassthroughSchema<T>(): StandardSchema<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "piqit/resolvers/static",
      validate(value: unknown) {
        return { value: value as T }
      },
    },
  }
}

// =============================================================================
// Resolver Factory
// =============================================================================

/**
 * Create a static content resolver from pre-compiled data.
 *
 * This resolver is designed for edge environments like Cloudflare Workers
 * where filesystem access is not available. Content is compiled at build
 * time and bundled as a static module.
 *
 * @param data - Array of pre-compiled content items
 * @returns A resolver that queries the static data
 *
 * @example
 * // In your worker:
 * import { posts } from "./generated/content";
 * import { staticContent } from "@piqit/resolvers";
 * import { piq } from "piqit";
 *
 * const postsResolver = staticContent(posts);
 *
 * export default {
 *   async fetch(request: Request) {
 *     const results = await piq.from(postsResolver)
 *       .scan({ year: "2024" })
 *       .select("params.slug", "frontmatter.title")
 *       .exec();
 *
 *     return Response.json(results);
 *   }
 * };
 */
export function staticContent<T extends object>(
  data: T[]
): Resolver<
  StandardSchema<Partial<Record<string, unknown>>>,
  StandardSchema<Partial<Record<string, unknown>>>,
  StandardSchema<T>
> {
  const scanSchema = createPassthroughSchema<Partial<Record<string, unknown>>>()
  const filterSchema = createPassthroughSchema<Partial<Record<string, unknown>>>()
  const resultSchema = createPassthroughSchema<T>()

  return {
    schema: {
      scanParams: scanSchema,
      filterParams: filterSchema,
      result: resultSchema,
    },

    async resolve(spec): Promise<Partial<T>[]> {
      let results = [...data]

      // Apply scan constraints (filter by params)
      if (spec.scan && Object.keys(spec.scan).length > 0) {
        results = results.filter((item) => matchesScan(item, spec.scan!))
      }

      // Apply filter constraints (filter by frontmatter)
      if (spec.filter && Object.keys(spec.filter).length > 0) {
        results = results.filter((item) => defaultFilter(item, spec.filter!))
      }

      // Apply select to return only requested fields
      if (spec.select && spec.select.length > 0) {
        return results.map((item) => selectFields(item, spec.select))
      }

      return results
    },
  }
}

/**
 * Alias for staticContent - provides a more descriptive name for the use case.
 */
export const staticResolver = staticContent
