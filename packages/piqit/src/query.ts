/**
 * piq v2 Query Builder
 *
 * Fluent API for building and executing queries against resolvers.
 */

import type {
  Resolver,
  StandardSchema,
  Infer,
  QuerySpec,
  FilterConstraints,
  SelectablePaths,
  HasCollision,
  Undot,
  UndotWithAliases,
} from "./types.js"
import { undot, undotWithAliases } from "./undot.js"

// =============================================================================
// Type Helpers
// =============================================================================

/** Extract the result type from a resolver */
type ResolverResult<R> = R extends Resolver<any, any, infer TResult>
  ? Infer<TResult>
  : never

/** Extract the scan params type from a resolver */
type ResolverScan<R> = R extends Resolver<infer TScan, any, any> ? Infer<TScan> : never

/** Extract the filter params type from a resolver */
type ResolverFilter<R> = R extends Resolver<any, infer TFilter, any>
  ? Infer<TFilter>
  : never

/** Concrete (non-wildcard) selectable paths, usable as sort keys */
type SortablePaths<R> = Exclude<SelectablePaths<ResolverResult<R>>, `${string}.*`>

/** Sort direction */
export type SortDirection = "asc" | "desc"

interface SortKey {
  path: string
  direction: SortDirection
}

/** Read a dot-path value from a namespaced record */
function getPathValue(record: Record<string, unknown>, path: string): unknown {
  let value: unknown = record
  for (const segment of path.split(".")) {
    if (value == null || typeof value !== "object") return undefined
    value = (value as Record<string, unknown>)[segment]
  }
  return value
}

/**
 * Compare two values for sorting. Numbers and dates compare numerically,
 * everything else compares as strings. Undefined/null sort last.
 */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === "number" && typeof b === "number") return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0
}

// =============================================================================
// QueryBuilder
// =============================================================================

/**
 * Fluent query builder for piq queries.
 *
 * @template TResolver - The resolver type
 * @template TResult - The result type (defaults to resolver's result, changes after select)
 */
export class QueryBuilder<
  TResolver extends Resolver<StandardSchema, StandardSchema, StandardSchema>,
  TResult = ResolverResult<TResolver>
> {
  private resolver: TResolver
  private _scanConstraints?: Partial<ResolverScan<TResolver>>
  private _filterConstraints?: FilterConstraints<ResolverFilter<TResolver>>
  private _selectPaths?: string[]
  private _selectAliases?: Record<string, string>
  private _sortKeys?: SortKey[]
  private _limit?: number

  constructor(resolver: TResolver) {
    this.resolver = resolver
  }

  // ===========================================================================
  // Scan Phase
  // ===========================================================================

  /**
   * Set scan constraints to narrow the initial data set.
   *
   * @param constraints - Partial scan parameters
   * @returns This builder for chaining
   */
  scan(constraints: Partial<ResolverScan<TResolver>>): this {
    this._scanConstraints = { ...this._scanConstraints, ...constraints }
    return this
  }

  // ===========================================================================
  // Filter Phase
  // ===========================================================================

  /**
   * Set filter constraints to further narrow results. Values are exact
   * matches, or operator objects: { contains: '...' } substring-matches
   * string fields (and string-array elements), case-sensitively.
   *
   * @param constraints - Filter parameters
   * @returns This builder for chaining
   *
   * @example
   * query.filter({ status: 'published', subject: { contains: 'Rule 30' } })
   */
  filter(constraints: FilterConstraints<ResolverFilter<TResolver>>): this {
    this._filterConstraints = { ...this._filterConstraints, ...constraints }
    return this
  }

  // ===========================================================================
  // Sort & Limit
  // ===========================================================================

  /**
   * Sort results by a dot-path. Chain multiple calls for multi-key sorts;
   * earlier keys take precedence. Sort keys don't need to be selected—the
   * resolver materializes them for ordering, but they're stripped from rows
   * unless also in the select.
   *
   * @param path - Concrete dot-path to sort by (wildcards not allowed)
   * @param direction - 'asc' (default) or 'desc'
   * @returns This builder for chaining
   *
   * @example
   * query.sort('params.date', 'desc').sort('frontmatter.title')
   */
  sort(path: SortablePaths<TResolver>, direction: SortDirection = "asc"): this {
    this._sortKeys = [...(this._sortKeys || []), { path: path as string, direction }]
    return this
  }

  /**
   * Limit the number of results, applied after sorting.
   *
   * @param count - Maximum number of rows to return
   * @returns This builder for chaining
   */
  limit(count: number): this {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`limit() requires a non-negative integer, got ${count}`)
    }
    this._limit = count
    return this
  }

  // ===========================================================================
  // Select Phase
  // ===========================================================================

  /**
   * Select specific fields using dot-paths (variadic form).
   *
   * @param paths - Dot-paths to select (e.g., 'params.slug', 'frontmatter.title')
   * @returns A new builder with typed result
   *
   * @example
   * query.select('params.slug', 'frontmatter.title')
   * // Result: { slug: string; title: string }
   */
  select<P extends SelectablePaths<ResolverResult<TResolver>>[]>(
    ...paths: P & (HasCollision<P> extends true ? never : P)
  ): QueryBuilder<TResolver, Undot<ResolverResult<TResolver>, P>>

  /**
   * Select specific fields using an alias object.
   *
   * @param aliases - Map of alias names to dot-paths
   * @returns A new builder with typed result
   *
   * @example
   * query.select({ mySlug: 'params.slug', myTitle: 'frontmatter.title' })
   * // Result: { mySlug: string; myTitle: string }
   */
  select<O extends Record<string, SelectablePaths<ResolverResult<TResolver>>>>(
    aliases: O
  ): QueryBuilder<TResolver, UndotWithAliases<ResolverResult<TResolver>, O>>

  // Implementation
  select(
    ...args: string[] | [Record<string, string>]
  ): QueryBuilder<TResolver, any> {
    // Create a new builder to maintain immutability
    const newBuilder = new QueryBuilder<TResolver, any>(this.resolver)
    newBuilder._scanConstraints = this._scanConstraints
    newBuilder._filterConstraints = this._filterConstraints
    newBuilder._sortKeys = this._sortKeys
    newBuilder._limit = this._limit

    if (args.length === 1 && typeof args[0] === "object" && !Array.isArray(args[0])) {
      // Object form (aliases)
      newBuilder._selectAliases = args[0] as Record<string, string>
    } else {
      // Variadic form
      newBuilder._selectPaths = args as string[]
    }

    return newBuilder
  }

  // ===========================================================================
  // Execution
  // ===========================================================================

  /**
   * Execute the query and return all results.
   *
   * @returns Promise resolving to array of typed results
   */
  async exec(): Promise<TResult[]> {
    if (!this._selectPaths && !this._selectAliases) {
      throw new Error(
        "Query execution requires .select(...). Call .select('params.*', 'frontmatter.*', 'body.*') before exec() if you want every namespace."
      )
    }

    const selectPaths = this.getSelectPaths()

    // Sort keys must be materialized by the resolver even when not selected
    const sortPaths = (this._sortKeys || []).map((k) => k.path)
    const resolvePaths = [...new Set([...selectPaths, ...sortPaths])]

    const spec: QuerySpec<
      ResolverScan<TResolver>,
      ResolverFilter<TResolver>,
      string
    > = {
      scan: this._scanConstraints,
      filter: this._filterConstraints,
      select: resolvePaths,
    }

    let rawResults = await this.resolver.resolve(spec as any)

    if (this._sortKeys?.length) {
      const keys = this._sortKeys
      rawResults = [...rawResults].sort((a, b) => {
        for (const { path, direction } of keys) {
          const cmp = compareValues(
            getPathValue(a as Record<string, unknown>, path),
            getPathValue(b as Record<string, unknown>, path)
          )
          if (cmp !== 0) return direction === "desc" ? -cmp : cmp
        }
        return 0
      })
    }

    if (this._limit !== undefined) {
      rawResults = rawResults.slice(0, this._limit)
    }

    // Transform results based on select mode
    if (this._selectAliases) {
      return rawResults.map((r) =>
        undotWithAliases(r as Record<string, unknown>, this._selectAliases!)
      ) as TResult[]
    }

    if (this._selectPaths) {
      return rawResults.map((r) =>
        undot(r as Record<string, unknown>, this._selectPaths!)
      ) as TResult[]
    }

    // No select - return raw results
    return rawResults as TResult[]
  }

  /**
   * Execute the query and return a single result.
   *
   * @returns A SingleQueryBuilder for accessing the first result
   */
  single(): SingleQueryBuilder<TResult> {
    return new SingleQueryBuilder(this)
  }

  /**
   * Execute the query and stream results.
   *
   * @returns AsyncGenerator yielding typed results one at a time
   */
  async *stream(): AsyncGenerator<TResult, void, unknown> {
    const results = await this.exec()
    for (const result of results) {
      yield result
    }
  }

  // ===========================================================================
  // Internal
  // ===========================================================================

  private getSelectPaths(): string[] {
    if (this._selectPaths) {
      return this._selectPaths
    }
    if (this._selectAliases) {
      return Object.values(this._selectAliases)
    }
    return []
  }
}

// =============================================================================
// SingleQueryBuilder
// =============================================================================

/**
 * Builder for single-result queries.
 *
 * @template TResult - The result type
 */
export class SingleQueryBuilder<TResult> {
  private queryBuilder: QueryBuilder<any, TResult>

  constructor(queryBuilder: QueryBuilder<any, TResult>) {
    this.queryBuilder = queryBuilder
  }

  /**
   * Execute and return the first result, or undefined if none.
   */
  async exec(): Promise<TResult | undefined> {
    const results = await this.queryBuilder.exec()
    return results[0]
  }

  /**
   * Execute and return the first result, throwing if none.
   *
   * @throws Error if no results found
   */
  async execOrThrow(): Promise<TResult> {
    const result = await this.exec()
    if (result === undefined) {
      throw new Error("Query returned no results")
    }
    return result
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a query builder from a resolver instance.
 *
 * @param resolver - The resolver instance
 * @returns A new QueryBuilder instance
 *
 * @example
 * const results = await from(postsResolver)
 *   .scan({})
 *   .select('params.slug', 'frontmatter.title')
 *   .exec()
 */
export function from<
  TResolver extends Resolver<StandardSchema, StandardSchema, StandardSchema>
>(resolver: TResolver): QueryBuilder<TResolver> {
  return new QueryBuilder(resolver)
}
