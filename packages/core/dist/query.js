import { WILDCARD } from "./types";
import { getCollection } from "./collection";
/**
 * Query builder for collections.
 * Implements a fluent API inspired by PostgREST.
 */
export class QueryBuilder {
    collection;
    searchConstraints = null;
    filterConstraints = null;
    selectSpec = null;
    constructor(collection) {
        this.collection = collection;
    }
    /**
     * Set search constraints (applied to path pattern matching).
     * Use "*" for wildcard (match all).
     */
    search(constraints) {
        this.searchConstraints = constraints;
        return this;
    }
    /**
     * Set filter constraints (applied to meta layer after search).
     * Requires metaResolver to be defined.
     */
    filter(constraints) {
        if (!this.collection.metaResolver) {
            throw new Error("Cannot use filter() without a metaResolver defined on the collection");
        }
        this.filterConstraints = constraints;
        return this;
    }
    /**
     * Specify which fields to select from each layer.
     * Only specified layers will be resolved.
     */
    select(spec) {
        this.selectSpec = spec;
        // Return this with narrowed types (cast needed for type narrowing)
        return this;
    }
    /**
     * Expect exactly one result. Throws if zero or more than one.
     */
    single() {
        return new SingleQueryBuilderImpl(this);
    }
    /**
     * Execute the query and return results.
     */
    async exec() {
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
    async executeSearch() {
        const constraints = this.searchConstraints === WILDCARD ? undefined : this.searchConstraints ?? undefined;
        return this.collection.searchResolver.search(constraints);
    }
    /**
     * Execute filter layer (meta-based filtering)
     */
    async executeFilter(searchResults) {
        if (!this.filterConstraints || !this.collection.metaResolver) {
            return searchResults;
        }
        const filterKeys = Object.keys(this.filterConstraints);
        const filtered = [];
        // Resolve meta for each result and filter
        await Promise.all(searchResults.map(async (result) => {
            const meta = await this.collection.metaResolver.resolve(result.path, filterKeys);
            // Check if all filter constraints match
            const matches = filterKeys.every((key) => {
                const filterValue = this.filterConstraints[key];
                const metaValue = meta[key];
                return metaValue === filterValue;
            });
            if (matches) {
                filtered.push(result);
            }
        }));
        return filtered;
    }
    /**
     * Resolve selected layers for filtered results
     */
    async resolveSelected(searchResults) {
        const needsMeta = this.selectSpec?.meta && this.selectSpec.meta.length > 0;
        const needsBody = this.selectSpec?.body && this.selectSpec.body.length > 0;
        return Promise.all(searchResults.map(async (searchResult) => {
            const result = {
                path: searchResult.path,
                search: this.pickFields(searchResult.params, this.selectSpec?.search),
            };
            // Resolve meta if selected
            if (needsMeta && this.collection.metaResolver) {
                const meta = await this.collection.metaResolver.resolve(searchResult.path, this.selectSpec.meta);
                result.meta = this.pickFields(meta, this.selectSpec?.meta);
            }
            // Resolve body if selected
            if (needsBody && this.collection.bodyResolver) {
                const body = await this.collection.bodyResolver.resolve(searchResult.path, this.selectSpec.body);
                result.body = this.pickFields(body, this.selectSpec?.body);
            }
            return result;
        }));
    }
    /**
     * Pick specific fields from an object
     */
    pickFields(obj, fields) {
        if (!fields || fields.length === 0) {
            return obj;
        }
        const picked = {};
        for (const field of fields) {
            if (field in obj) {
                picked[field] = obj[field];
            }
        }
        return picked;
    }
}
/**
 * Implementation of single query builder
 */
class SingleQueryBuilderImpl {
    builder;
    constructor(builder) {
        this.builder = builder;
    }
    async exec() {
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
export function from(collectionName) {
    const collection = getCollection(collectionName);
    return new QueryBuilder(collection);
}
/**
 * Main piq API object
 */
export const piq = {
    from,
};
//# sourceMappingURL=query.js.map