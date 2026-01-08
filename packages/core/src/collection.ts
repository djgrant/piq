import type {
  CollectionDefinition,
  CollectionRegistry,
} from "./types";

/**
 * Define a collection with typed search, meta, and body layers.
 *
 * @example
 * ```ts
 * const posts = defineCollection({
 *   searchSchema: z.object({ slug: z.string(), date: z.coerce.date() }),
 *   searchResolver: globResolver({ base: "content", path: "posts/{date}/{slug}.md" }),
 *
 *   metaSchema: z.object({ title: z.string(), tags: z.array(z.string()) }),
 *   metaResolver: frontmatterResolver(),
 *
 *   bodySchema: z.object({ html: z.string() }),
 *   bodyResolver: markdownResolver(),
 * });
 * ```
 */
export function defineCollection<
  TSearch,
  TMeta = undefined,
  TBody = undefined,
>(
  definition: CollectionDefinition<TSearch, TMeta, TBody>
): CollectionDefinition<TSearch, TMeta, TBody> {
  return definition;
}

/**
 * Registry for storing collection definitions.
 * Used by the query builder to look up collections by name.
 */
let globalRegistry: CollectionRegistry = {};

/**
 * Register collections in the global registry.
 *
 * @example
 * ```ts
 * registerCollections({
 *   posts: defineCollection({ ... }),
 *   pages: defineCollection({ ... }),
 * });
 * ```
 */
export function registerCollections(collections: CollectionRegistry): void {
  globalRegistry = { ...globalRegistry, ...collections };
}

/**
 * Get a collection by name from the registry.
 * Throws if the collection is not found.
 */
export function getCollection(
  name: string
): CollectionDefinition<unknown, unknown, unknown> {
  const collection = globalRegistry[name];
  if (!collection) {
    const available = Object.keys(globalRegistry);
    throw new Error(
      `Collection "${name}" not found. Available: ${available.join(", ") || "(none)"}`
    );
  }
  return collection;
}

/**
 * Clear all registered collections (useful for testing).
 */
export function clearCollections(): void {
  globalRegistry = {};
}

/**
 * Get all registered collection names.
 */
export function getCollectionNames(): string[] {
  return Object.keys(globalRegistry);
}
