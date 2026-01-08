import type { CollectionDefinition, QueryResult, Wildcard } from "./types";
/**
 * Query builder for collections.
 * Implements a fluent API inspired by PostgREST.
 */
export declare class QueryBuilder<TSearch = unknown, TMeta = unknown, TBody = unknown> {
    private collection;
    private searchConstraints;
    private filterConstraints;
    private selectSpec;
    constructor(collection: CollectionDefinition<TSearch, TMeta, TBody>);
    /**
     * Set search constraints (applied to path pattern matching).
     * Use "*" for wildcard (match all).
     */
    search(constraints: Partial<TSearch> | Wildcard): this;
    /**
     * Set filter constraints (applied to meta layer after search).
     * Requires metaResolver to be defined.
     */
    filter(constraints: Partial<TMeta>): this;
    /**
     * Specify which fields to select from each layer.
     * Only specified layers will be resolved.
     */
    select<SKeys extends keyof TSearch = never, MKeys extends keyof TMeta = never, BKeys extends keyof TBody = never>(spec: {
        search?: SKeys[];
        meta?: MKeys[];
        body?: BKeys[];
    }): QueryBuilder<SKeys extends never ? TSearch : Pick<TSearch, SKeys>, MKeys extends never ? TMeta : Pick<TMeta, MKeys>, BKeys extends never ? TBody : Pick<TBody, BKeys>>;
    /**
     * Expect exactly one result. Throws if zero or more than one.
     */
    single(): SingleQueryBuilder<TSearch, TMeta, TBody>;
    /**
     * Execute the query and return results.
     */
    exec(): Promise<QueryResult<TSearch, TMeta, TBody>[]>;
    /**
     * Execute search layer
     */
    private executeSearch;
    /**
     * Execute filter layer (meta-based filtering)
     */
    private executeFilter;
    /**
     * Resolve selected layers for filtered results
     */
    private resolveSelected;
    /**
     * Pick specific fields from an object
     */
    private pickFields;
}
/**
 * Single result query builder interface
 */
export interface SingleQueryBuilder<TSearch, TMeta, TBody> {
    exec(): Promise<QueryResult<TSearch, TMeta, TBody>>;
}
/**
 * Create a query builder from a collection name
 */
export declare function from<TSearch = unknown, TMeta = unknown, TBody = unknown>(collectionName: string): QueryBuilder<TSearch, TMeta, TBody>;
/**
 * Main piq API object
 */
export declare const piq: {
    from: typeof from;
};
//# sourceMappingURL=query.d.ts.map