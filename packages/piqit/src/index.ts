/**
 * @piq/core - Core types and query builder for piq v2
 *
 * @packageDocumentation
 */

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // StandardSchema types
  StandardSchema,
  StandardSchemaResult,
  StandardSchemaIssue,
  Infer,

  // Type utilities
  SelectablePaths,
  GetFieldName,
  GetPathValue,
  ExpandWildcard,
  HasCollision,
  Undot,
  UndotWithAliases,
  ExpandAllWildcards,
  ValidateSelect,

  // Query types
  QuerySpec,

  // Resolver types
  Resolver,
} from "./types"

// =============================================================================
// Query Builder
// =============================================================================

export { QueryBuilder, SingleQueryBuilder, from } from "./query"

// =============================================================================
// Undotting Utilities
// =============================================================================

export {
  undot,
  undotWithAliases,
  undotAll,
  undotAllWithAliases,
  expandWildcards,
} from "./undot"

// =============================================================================
// Main API Object
// =============================================================================

import { from } from "./query"

/**
 * The main piq API object.
 *
 * @example
 * // Create a query
 * const posts = await piq
 *   .from(postsResolver)
 *   .scan({ pattern: 'content/*.md' })
 *   .filter({ draft: false })
 *   .select('params.slug', 'frontmatter.title')
 *   .exec()
 */
export const piq = {
  /**
   * Start a query from a resolver.
   *
   * @param resolver - The resolver instance
   * @returns A new QueryBuilder instance
   */
  from,
}
