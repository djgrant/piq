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
// Registry
// =============================================================================

export { register, getResolver, clearRegistry, hasResolver } from "./registry"
export type { Registry } from "./registry"

// =============================================================================
// Query Builder
// =============================================================================

export { QueryBuilder, SingleQueryBuilder, from, fromResolver } from "./query"

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
import { register, getResolver, clearRegistry, hasResolver } from "./registry"

/**
 * The main piq API object.
 *
 * @example
 * // Create a query
 * const posts = await piq
 *   .from('posts')
 *   .scan({ pattern: 'content/*.md' })
 *   .filter({ draft: false })
 *   .select('params.slug', 'frontmatter.title')
 *   .exec()
 */
export const piq = {
  /**
   * Start a query from a registered resolver.
   *
   * @param name - The registered resolver name
   * @returns A new QueryBuilder instance
   */
  from,

  /**
   * Register a resolver.
   *
   * @param name - Unique name for the resolver
   * @param resolver - The resolver instance
   */
  register,

  /**
   * Get a registered resolver by name.
   *
   * @param name - The resolver name
   * @returns The resolver instance
   */
  getResolver,

  /**
   * Clear all registered resolvers (for testing).
   */
  clearRegistry,

  /**
   * Check if a resolver is registered.
   *
   * @param name - The resolver name
   * @returns True if registered
   */
  hasResolver,
}
