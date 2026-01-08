/**
 * Standard Schema interface for validator compatibility.
 * Works with Zod, Valibot, ArkType, etc.
 */
export interface StandardSchema<T = unknown> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardSchemaResult<T>;
  };
  readonly "~types"?: {
    readonly input: unknown;
    readonly output: T;
  };
}

export interface StandardSchemaResult<T> {
  readonly value?: T;
  readonly issues?: readonly StandardSchemaIssue[];
}

export interface StandardSchemaIssue {
  readonly message: string;
  readonly path?: readonly (string | number)[];
}

/**
 * Infer the output type from a Standard Schema
 */
export type InferSchema<S> = S extends StandardSchema<infer T> ? T : never;

/**
 * Path pattern syntax:
 * - {param} — required parameter
 * - {?param} — optional parameter
 * - {...param} — splat/rest (captures remaining segments)
 */
export type PathPattern = string;

/**
 * Extract parameter names from a path pattern
 */
export type ExtractPathParams<P extends string> =
  P extends `${string}{...${infer Param}}${infer Rest}`
    ? Param | ExtractPathParams<Rest>
    : P extends `${string}{?${infer Param}}${infer Rest}`
      ? Param | ExtractPathParams<Rest>
      : P extends `${string}{${infer Param}}${infer Rest}`
        ? Param | ExtractPathParams<Rest>
        : never;

/**
 * Search resolver interface - finds matching paths without file I/O
 */
export interface SearchResolver<TSearch> {
  /**
   * Find all paths matching the pattern, optionally filtered by search constraints.
   * Returns paths with extracted parameters.
   */
  search(constraints?: Partial<TSearch>): Promise<SearchResult<TSearch>[]>;

  /**
   * Get the path for a specific set of search parameters
   */
  getPath?(params: TSearch): string;
}

export interface SearchResult<TSearch> {
  /** Absolute file path */
  path: string;
  /** Extracted search parameters from the path */
  params: TSearch;
}

/**
 * Meta resolver interface - reads metadata from files (light I/O)
 */
export interface MetaResolver<TMeta> {
  /**
   * Read metadata from a file path.
   * Should be optimized for light I/O (e.g., read only frontmatter).
   * 
   * @param path - Absolute file path
   * @param fields - Optional subset of fields to read (for early-stop optimization)
   */
  resolve(path: string, fields?: (keyof TMeta)[]): Promise<TMeta>;
}

/**
 * Body resolver interface - reads and parses full content (heavy I/O)
 */
export interface BodyResolver<TBody> {
  /**
   * Read and parse the body content from a file.
   * 
   * @param path - Absolute file path
   * @param fields - Optional subset of fields to compute
   */
  resolve(path: string, fields?: (keyof TBody)[]): Promise<TBody>;
}

/**
 * Collection definition with three-layer schema
 */
export interface CollectionDefinition<
  TSearch = unknown,
  TMeta = unknown,
  TBody = unknown,
> {
  /** Schema for search layer (path-extracted fields) */
  searchSchema: StandardSchema<TSearch>;
  /** Resolver for search layer */
  searchResolver: SearchResolver<TSearch>;

  /** Schema for meta layer (frontmatter/light metadata) */
  metaSchema?: StandardSchema<TMeta>;
  /** Resolver for meta layer */
  metaResolver?: MetaResolver<TMeta>;

  /** Schema for body layer (parsed content) */
  bodySchema?: StandardSchema<TBody>;
  /** Resolver for body layer */
  bodyResolver?: BodyResolver<TBody>;
}

/**
 * Registry of defined collections
 */
export type CollectionRegistry = Record<
  string,
  CollectionDefinition<unknown, unknown, unknown>
>;

/**
 * Query result shape - namespaced by layer
 */
export interface QueryResult<
  TSearch = unknown,
  TMeta = unknown,
  TBody = unknown,
> {
  /** Absolute file path */
  path: string;
  /** Search layer data (from path parsing) */
  search: TSearch;
  /** Meta layer data (from frontmatter) */
  meta?: TMeta;
  /** Body layer data (from content parsing) */
  body?: TBody;
}

/**
 * Select specification for query
 */
export interface SelectSpec<TSearch, TMeta, TBody> {
  search?: (keyof TSearch)[];
  meta?: (keyof TMeta)[];
  body?: (keyof TBody)[];
}

/**
 * Wildcard search indicator
 */
export const WILDCARD = "*" as const;
export type Wildcard = typeof WILDCARD;
