import type {
  CollectionDefinition,
  QueryResult,
  SelectSpec,
  Wildcard,
} from "./types";
import { WILDCARD } from "./types";
import { getCollection } from "./collection";

/**
 * Semaphore for concurrency control.
 * Limits the number of concurrent async operations.
 */
class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }
}

/**
 * Options for streaming query execution
 */
export interface StreamOptions {
  /** Maximum concurrent file operations. Default: 50 */
  concurrency?: number;
}

/**
 * Query builder for collections.
 * Implements a fluent API inspired by PostgREST.
 */
export class QueryBuilder<
  TSearch = unknown,
  TMeta = unknown,
  TBody = unknown,
> {
  private collection: CollectionDefinition<TSearch, TMeta, TBody>;
  private searchConstraints: Partial<TSearch> | Wildcard | null = null;
  private filterConstraints: Partial<TMeta> | null = null;
  private selectSpec: SelectSpec<TSearch, TMeta, TBody> | null = null;
  private metaCache: Map<string, Partial<TMeta>> | null = null;

  constructor(collection: CollectionDefinition<TSearch, TMeta, TBody>) {
    this.collection = collection;
  }

  /**
   * Set search constraints (applied to path pattern matching).
   * Use "*" for wildcard (match all).
   */
  search(constraints: Partial<TSearch> | Wildcard): this {
    this.searchConstraints = constraints;
    return this;
  }

  /**
   * Set filter constraints (applied to meta layer after search).
   * Requires metaResolver to be defined.
   */
  filter(constraints: Partial<TMeta>): this {
    if (!this.collection.metaResolver) {
      throw new Error(
        "Cannot use filter() without a metaResolver defined on the collection"
      );
    }
    this.filterConstraints = constraints;
    return this;
  }

  /**
   * Specify which fields to select from each layer.
   * Only specified layers will be resolved.
   */
  select<
    SKeys extends keyof TSearch = never,
    MKeys extends keyof TMeta = never,
    BKeys extends keyof TBody = never,
  >(
    spec: {
      search?: SKeys[];
      meta?: MKeys[];
      body?: BKeys[];
    }
  ): QueryBuilder<
    SKeys extends never ? TSearch : Pick<TSearch, SKeys>,
    MKeys extends never ? TMeta : Pick<TMeta, MKeys>,
    BKeys extends never ? TBody : Pick<TBody, BKeys>
  > {
    this.selectSpec = spec as SelectSpec<TSearch, TMeta, TBody>;
    // Return this with narrowed types (cast needed for type narrowing)
    return this as unknown as QueryBuilder<
      SKeys extends never ? TSearch : Pick<TSearch, SKeys>,
      MKeys extends never ? TMeta : Pick<TMeta, MKeys>,
      BKeys extends never ? TBody : Pick<TBody, BKeys>
    >;
  }

  /**
   * Expect exactly one result. Throws if zero or more than one.
   */
  single(): SingleQueryBuilder<TSearch, TMeta, TBody> {
    return new SingleQueryBuilderImpl(this);
  }

  /**
   * Execute the query and return results.
   */
  async exec(): Promise<QueryResult<TSearch, TMeta, TBody>[]> {
    // Step 1: Search - find matching paths (no param extraction yet)
    const paths = await this.executeSearch();

    // Step 2: Pre-resolve meta if both filter and select need it
    const metaKeys = this.getRequiredMetaKeys();
    if (metaKeys && this.filterConstraints && this.selectSpec?.meta?.length) {
      await this.preResolveMeta(paths, metaKeys);
    }

    // Step 3: Filter by meta if needed
    const filteredPaths = await this.executeFilter(paths);

    // Step 4: Resolve selected layers (including lazy param extraction)
    const results = await this.resolveSelected(filteredPaths);

    return results;
  }

  /**
   * Execute the query as a stream, yielding results one at a time.
   * Supports early termination and concurrency control.
   * 
   * @param options - Stream options including concurrency limit
   */
  async *stream(options?: StreamOptions): AsyncGenerator<QueryResult<TSearch, TMeta, TBody>> {
    const concurrency = options?.concurrency ?? 50;
    const semaphore = new Semaphore(concurrency);

    // Get the async iterator from search resolver
    const scanner = this.getScanner();

    for await (const path of scanner) {
      await semaphore.acquire();

      try {
        // Filter check (if applicable)
        if (this.filterConstraints && this.collection.metaResolver) {
          const filterKeys = Object.keys(this.filterConstraints) as (keyof TMeta)[];
          const meta = await this.collection.metaResolver.resolve(path, filterKeys);

          if (!this.matchesFilter(meta, filterKeys)) {
            continue; // Skip non-matching, semaphore released in finally
          }
        }

        // Resolve selected layers
        const result = await this.resolveOne(path);
        yield result;
      } finally {
        semaphore.release();
      }
    }
  }

  /**
   * Get a scanner (async iterator) for paths.
   * Uses scan() if available, otherwise wraps search() result.
   */
  private getScanner(): AsyncIterable<string> {
    const constraints =
      this.searchConstraints === WILDCARD ? undefined : this.searchConstraints ?? undefined;

    // Use scan() if available, otherwise wrap search() result
    if (this.collection.searchResolver.scan) {
      return this.collection.searchResolver.scan(constraints as Partial<TSearch> | undefined);
    }

    // Fallback: convert search() to async iterable
    return this.wrapSearchAsIterable(constraints as Partial<TSearch> | undefined);
  }

  /**
   * Wrap search() results as an async generator for fallback
   */
  private async *wrapSearchAsIterable(
    constraints: Partial<TSearch> | undefined
  ): AsyncGenerator<string> {
    const results = await this.collection.searchResolver.search(constraints);
    for (const path of results) {
      yield path;
    }
  }

  /**
   * Resolve a single path into a query result
   */
  private async resolveOne(path: string): Promise<QueryResult<TSearch, TMeta, TBody>> {
    // Determine what's needed
    const hasSelectSpec = this.selectSpec !== null;
    const needsSearch = !hasSelectSpec ||
      (this.selectSpec?.search && this.selectSpec.search.length > 0);
    const needsMeta =
      this.selectSpec?.meta && this.selectSpec.meta.length > 0;
    const needsBody =
      this.selectSpec?.body && this.selectSpec.body.length > 0;

    const result: QueryResult<TSearch, TMeta, TBody> = {
      path,
      search: {} as TSearch,
    };

    // Extract params when needed
    if (needsSearch) {
      const params = this.collection.searchResolver.extractParams(path);
      result.search = this.pickFields(params, this.selectSpec?.search) as TSearch;
    }

    // Resolve meta if selected
    if (needsMeta && this.collection.metaResolver) {
      const meta = await this.collection.metaResolver.resolve(
        path,
        this.selectSpec!.meta as (keyof TMeta)[]
      );
      result.meta = this.pickFields(meta, this.selectSpec?.meta) as TMeta;
    }

    // Resolve body if selected
    if (needsBody && this.collection.bodyResolver) {
      const body = await this.collection.bodyResolver.resolve(
        path,
        this.selectSpec!.body as (keyof TBody)[]
      );
      result.body = this.pickFields(body, this.selectSpec?.body) as TBody;
    }

    return result;
  }

  /**
   * Check if meta matches filter constraints
   */
  private matchesFilter(meta: TMeta, filterKeys: (keyof TMeta)[]): boolean {
    return filterKeys.every((key) => {
      const filterValue = this.filterConstraints![key];
      const metaValue = meta[key];
      return metaValue === filterValue;
    });
  }

  /**
   * Get combined meta keys needed for both filter and select.
   * Returns null if no meta keys are needed.
   */
  private getRequiredMetaKeys(): (keyof TMeta)[] | null {
    const filterKeys = this.filterConstraints
      ? (Object.keys(this.filterConstraints) as (keyof TMeta)[])
      : [];
    const selectKeys = (this.selectSpec?.meta as (keyof TMeta)[]) ?? [];

    const combined = [...new Set([...filterKeys, ...selectKeys])];
    return combined.length > 0 ? combined : null;
  }

  /**
   * Pre-resolve meta for all paths when both filter and select need meta.
   * Caches results for use by executeFilter and resolveSelected.
   */
  private async preResolveMeta(
    paths: string[],
    keys: (keyof TMeta)[]
  ): Promise<void> {
    if (!this.collection.metaResolver) return;

    this.metaCache = new Map();
    await Promise.all(
      paths.map(async (path) => {
        const meta = await this.collection.metaResolver!.resolve(path, keys);
        this.metaCache!.set(path, meta);
      })
    );
  }

  /**
   * Execute search layer - returns paths only for lazy extraction
   */
  private async executeSearch(): Promise<string[]> {
    const constraints =
      this.searchConstraints === WILDCARD ? undefined : this.searchConstraints ?? undefined;

    return this.collection.searchResolver.search(constraints as Partial<TSearch> | undefined);
  }

  /**
   * Execute filter layer (meta-based filtering)
   */
  private async executeFilter(paths: string[]): Promise<string[]> {
    if (!this.filterConstraints || !this.collection.metaResolver) {
      return paths;
    }

    const filterKeys = Object.keys(this.filterConstraints) as (keyof TMeta)[];
    const filtered: string[] = [];

    // Resolve meta for each path and filter
    await Promise.all(
      paths.map(async (path) => {
        // Use cache if available, otherwise resolve
        const meta =
          this.metaCache?.get(path) ??
          (await this.collection.metaResolver!.resolve(path, filterKeys));

        // Check if all filter constraints match
        const matches = filterKeys.every((key) => {
          const filterValue = this.filterConstraints![key];
          const metaValue = meta[key];
          return metaValue === filterValue;
        });

        if (matches) {
          filtered.push(path);
        }
      })
    );

    return filtered;
  }

  /**
   * Resolve selected layers for filtered paths.
   * Implements lazy param extraction - only extracts when search fields are needed.
   * 
   * Extraction happens when:
   * - No selectSpec is provided (backwards compatible - return all params)
   * - selectSpec.search has fields specified
   * 
   * Extraction is skipped when:
   * - selectSpec is provided but search is empty or not specified
   */
  private async resolveSelected(
    paths: string[]
  ): Promise<QueryResult<TSearch, TMeta, TBody>[]> {
    // Determine what's needed
    // If no selectSpec at all, we need all search params (backwards compatible)
    // If selectSpec exists but search is empty/undefined, skip extraction
    const hasSelectSpec = this.selectSpec !== null;
    const needsSearch = !hasSelectSpec || 
      (this.selectSpec?.search && this.selectSpec.search.length > 0);
    const needsMeta =
      this.selectSpec?.meta && this.selectSpec.meta.length > 0;
    const needsBody =
      this.selectSpec?.body && this.selectSpec.body.length > 0;

    return Promise.all(
      paths.map(async (path) => {
        const result: QueryResult<TSearch, TMeta, TBody> = {
          path,
          search: {} as TSearch, // Default empty when not needed
        };

        // Extract params when needed (backwards compatible behavior)
        if (needsSearch) {
          const params = this.collection.searchResolver.extractParams(path);
          result.search = this.pickFields(
            params,
            this.selectSpec?.search
          ) as TSearch;
        }

        // Resolve meta if selected
        if (needsMeta && this.collection.metaResolver) {
          // Use cache if available, otherwise resolve
          const meta =
            this.metaCache?.get(path) ??
            (await this.collection.metaResolver.resolve(
              path,
              this.selectSpec!.meta as (keyof TMeta)[]
            ));
          result.meta = this.pickFields(
            meta,
            this.selectSpec?.meta
          ) as TMeta;
        }

        // Resolve body if selected
        if (needsBody && this.collection.bodyResolver) {
          const body = await this.collection.bodyResolver.resolve(
            path,
            this.selectSpec!.body as (keyof TBody)[]
          );
          result.body = this.pickFields(
            body,
            this.selectSpec?.body
          ) as TBody;
        }

        return result;
      })
    );
  }

  /**
   * Pick specific fields from an object
   */
  private pickFields<T>(
    obj: T,
    fields?: (keyof T)[]
  ): Partial<T> | T {
    if (!fields || fields.length === 0) {
      return obj;
    }

    const picked: Partial<T> = {};
    for (const field of fields) {
      if (field in (obj as object)) {
        picked[field] = obj[field];
      }
    }
    return picked;
  }
}

/**
 * Single result query builder interface
 */
export interface SingleQueryBuilder<TSearch, TMeta, TBody> {
  exec(): Promise<QueryResult<TSearch, TMeta, TBody>>;
}

/**
 * Implementation of single query builder
 */
class SingleQueryBuilderImpl<TSearch, TMeta, TBody>
  implements SingleQueryBuilder<TSearch, TMeta, TBody>
{
  private builder: QueryBuilder<TSearch, TMeta, TBody>;

  constructor(builder: QueryBuilder<TSearch, TMeta, TBody>) {
    this.builder = builder;
  }

  async exec(): Promise<QueryResult<TSearch, TMeta, TBody>> {
    const results = await this.builder.exec();

    if (results.length === 0) {
      throw new Error("No results found");
    }
    if (results.length > 1) {
      throw new Error(`Expected single result, got ${results.length}`);
    }

    return results[0];
  }
}

/**
 * Create a query builder from a collection name
 */
export function from<TSearch = unknown, TMeta = unknown, TBody = unknown>(
  collectionName: string
): QueryBuilder<TSearch, TMeta, TBody> {
  const collection = getCollection(collectionName) as CollectionDefinition<
    TSearch,
    TMeta,
    TBody
  >;
  return new QueryBuilder(collection);
}

/**
 * Main piq API object
 */
export const piq = {
  from,
};
