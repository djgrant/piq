// Type exports
export type {
  StandardSchema,
  StandardSchemaResult,
  StandardSchemaIssue,
  InferSchema,
  PathPattern,
  ExtractPathParams,
  SearchResolver,
  SearchResult,
  MetaResolver,
  BodyResolver,
  CollectionDefinition,
  CollectionRegistry,
  QueryResult,
  SelectSpec,
  Wildcard,
} from "./types";

export { WILDCARD } from "./types";

// Collection API
export {
  defineCollection,
  registerCollections,
  getCollection,
  clearCollections,
  getCollectionNames,
} from "./collection";

// Path pattern utilities
export {
  compilePattern,
  matchPattern,
  buildPath,
} from "./path-pattern";
export type { PathParam, CompiledPattern } from "./path-pattern";

// Query API
export { piq, from, QueryBuilder } from "./query";
