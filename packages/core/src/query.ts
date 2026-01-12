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
  SelectablePaths,
  HasCollision,
  Undot,
  UndotWithAliases,
} from "./types"
import { undot, undotWithAliases } from "./undot"

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
  private _filterConstraints?: Partial<ResolverFilter<TResolver>>
  private _selectPaths?: string[]
  private _selectAliases?: Record<string, string>

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
   * Set filter constraints to further narrow results.
   *
   * @param constraints - Partial filter parameters
   * @returns This builder for chaining
   */
  filter(constraints: Partial<ResolverFilter<TResolver>>): this {
    this._filterConstraints = { ...this._filterConstraints, ...constraints }
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
    const selectPaths = this.getSelectPaths()

    const spec: QuerySpec<
      ResolverScan<TResolver>,
      ResolverFilter<TResolver>,
      string
    > = {
      scan: this._scanConstraints,
      filter: this._filterConstraints,
      select: selectPaths,
    }

    const rawResults = await this.resolver.resolve(spec as any)

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
    // No select specified - this would need to select all fields
    // For now, throw an error
    throw new Error("No select specified. Use .select() to specify fields to retrieve.")
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
