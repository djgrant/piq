/**
 * piq v2 Core Types
 *
 * These types establish the contract between piq core and resolvers.
 * The resolver owns schemas; piq owns query shape and result transformation.
 */

// =============================================================================
// StandardSchema Interface (for Zod/Valibot compatibility)
// =============================================================================

/**
 * Result of a StandardSchema validation
 */
export type StandardSchemaResult<T> =
  | { readonly value: T; readonly issues?: undefined }
  | { readonly issues: readonly StandardSchemaIssue[] }

/**
 * A validation issue from StandardSchema
 */
export interface StandardSchemaIssue {
  readonly message: string
  readonly path?: readonly (string | number | symbol | StandardSchemaPathSegment)[]
}

/**
 * A path segment object from StandardSchema v1.
 */
export interface StandardSchemaPathSegment {
  readonly key: string | number | symbol
}

/**
 * StandardSchema interface for interoperability with Zod, Valibot, etc.
 * @see https://github.com/standard-schema/standard-schema
 */
export interface StandardSchema<T = unknown> {
  readonly "~standard": {
    readonly version: 1
    readonly vendor: string
    readonly validate: (value: unknown) => StandardSchemaResult<T> | Promise<StandardSchemaResult<T>>
  }
}

/**
 * Infer the output type from a StandardSchema
 */
export type Infer<S> = S extends StandardSchema<infer T> ? T : never

// =============================================================================
// Type Utilities (from select-types.ts)
// =============================================================================

export type {
  SelectablePaths,
  GetFieldName,
  GetPathValue,
  ExpandWildcard,
  HasCollision,
  Undot,
  UndotWithAliases,
  ExpandAllWildcards,
  ValidateSelect
} from "./select-types.js"

import type { SelectablePaths } from "./select-types.js"

// =============================================================================
// Filter Constraints
// =============================================================================

/**
 * Operator form of a filter constraint. `contains` substring-matches string
 * fields, and matches string-array fields when any element contains the
 * needle. Matching is case-sensitive.
 */
export type FilterOperator = { contains: string }

/**
 * A filter value: either an exact value or an operator object.
 */
export type FilterConstraints<T> = {
  [K in keyof T]?: T[K] | FilterOperator
}

// =============================================================================
// QuerySpec
// =============================================================================

/**
 * Specification for a query against a resolver.
 *
 * @template TScan - The type of scan parameters (glob patterns, etc.)
 * @template TFilter - The type of filter parameters (predicates)
 * @template TSelect - The selectable paths as a string union
 */
export interface QuerySpec<TScan, TFilter, TSelect extends string> {
  /**
   * Parameters for the initial scan phase (e.g., glob patterns).
   * These narrow down which files/items to consider.
   */
  scan?: Partial<TScan>

  /**
   * Parameters for filtering scanned items.
   * Applied after scan to further reduce the result set.
   * Values are exact matches or operator objects such as { contains: '...' }.
   */
  filter?: FilterConstraints<TFilter>

  /**
   * Fields to include in the result using dot-notation paths.
   * e.g., ["frontmatter.title", "params.slug", "body.content"]
   */
  select: TSelect[]
}

// =============================================================================
// Resolver Interface
// =============================================================================

/**
 * A resolver that can query a data source and return typed results.
 *
 * The resolver owns its schemas:
 * - scanParams: What parameters control the initial scan (e.g., glob patterns)
 * - filterParams: What parameters filter the results (e.g., predicates)
 * - result: The namespaced shape of results { params: {...}, frontmatter: {...}, body: {...} }
 *
 * @template TScanSchema - StandardSchema for scan parameters
 * @template TFilterSchema - StandardSchema for filter parameters
 * @template TResultSchema - StandardSchema for the namespaced result shape
 */
/**
 * Optional introspection metadata a resolver can expose for tooling
 * (e.g. the piq CLI's schema output). StandardSchema doesn't support
 * enumerating fields, so resolvers surface what they know here.
 */
export interface ResolverMeta {
  /** Keys accepted by scan() */
  scanKeys?: string[]
  /** Keys accepted by filter() */
  filterKeys?: string[]
  /** Concrete selectable dot-paths */
  selectPaths?: string[]
}

export interface Resolver<
  TScanSchema extends StandardSchema,
  TFilterSchema extends StandardSchema,
  TResultSchema extends StandardSchema
> {
  /**
   * Optional introspection metadata for tooling.
   */
  meta?: ResolverMeta
  /**
   * The schemas that define this resolver's contract.
   */
  schema: {
    /** Schema for scan parameters */
    scanParams: TScanSchema
    /** Schema for filter parameters */
    filterParams: TFilterSchema
    /** Schema for result shape (namespaced: { params: {...}, frontmatter: {...}, body: {...} }) */
    result: TResultSchema
  }

  /**
   * Execute a query against this resolver.
   *
   * @param spec - The query specification with scan, filter, and select parameters
   * @returns A promise resolving to an array of partial results based on selected fields
   */
  resolve(
    spec: QuerySpec<
      Infer<TScanSchema>,
      Infer<TFilterSchema>,
      SelectablePaths<Infer<TResultSchema>>
    >
  ): Promise<Partial<Infer<TResultSchema>>[]>
}
