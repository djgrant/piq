import type {
  CollectionDefinition,
  QueryResult,
  SelectSpec,
  SearchResult,
  Wildcard,
} from "./types";
import { WILDCARD } from "./types";
import { getCollection } from "./collection";

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
    // Step 1: Search - find matching paths
    const searchResults = await this.executeSearch();

    // Step 2: Filter by meta if needed
    const filteredResults = await this.executeFilter(searchResults);

    // Step 3: Resolve selected layers
    const results = await this.resolveSelected(filteredResults);

    return results;
  }

  /**
   * Execute search layer
   */
  private async executeSearch(): Promise<SearchResult<TSearch>[]> {
    const constraints =
      this.searchConstraints === WILDCARD ? undefined : this.searchConstraints ?? undefined;

    return this.collection.searchResolver.search(constraints as Partial<TSearch> | undefined);
  }

  /**
   * Execute filter layer (meta-based filtering)
   */
  private async executeFilter(
    searchResults: SearchResult<TSearch>[]
  ): Promise<SearchResult<TSearch>[]> {
    if (!this.filterConstraints || !this.collection.metaResolver) {
      return searchResults;
    }

    const filterKeys = Object.keys(this.filterConstraints) as (keyof TMeta)[];
    const filtered: SearchResult<TSearch>[] = [];

    // Resolve meta for each result and filter
    await Promise.all(
      searchResults.map(async (result) => {
        const meta = await this.collection.metaResolver!.resolve(
          result.path,
          filterKeys
        );

        // Check if all filter constraints match
        const matches = filterKeys.every((key) => {
          const filterValue = this.filterConstraints![key];
          const metaValue = meta[key];
          return metaValue === filterValue;
        });

        if (matches) {
          filtered.push(result);
        }
      })
    );

    return filtered;
  }

  /**
   * Resolve selected layers for filtered results
   */
  private async resolveSelected(
    searchResults: SearchResult<TSearch>[]
  ): Promise<QueryResult<TSearch, TMeta, TBody>[]> {
    const needsMeta =
      this.selectSpec?.meta && this.selectSpec.meta.length > 0;
    const needsBody =
      this.selectSpec?.body && this.selectSpec.body.length > 0;

    return Promise.all(
      searchResults.map(async (searchResult) => {
        const result: QueryResult<TSearch, TMeta, TBody> = {
          path: searchResult.path,
          search: this.pickFields(
            searchResult.params,
            this.selectSpec?.search
          ) as TSearch,
        };

        // Resolve meta if selected
        if (needsMeta && this.collection.metaResolver) {
          const meta = await this.collection.metaResolver.resolve(
            searchResult.path,
            this.selectSpec!.meta as (keyof TMeta)[]
          );
          result.meta = this.pickFields(
            meta,
            this.selectSpec?.meta
          ) as TMeta;
        }

        // Resolve body if selected
        if (needsBody && this.collection.bodyResolver) {
          const body = await this.collection.bodyResolver.resolve(
            searchResult.path,
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
