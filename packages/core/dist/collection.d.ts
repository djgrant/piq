import type { CollectionDefinition, CollectionRegistry } from "./types";
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
export declare function defineCollection<TSearch, TMeta = undefined, TBody = undefined>(definition: CollectionDefinition<TSearch, TMeta, TBody>): CollectionDefinition<TSearch, TMeta, TBody>;
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
export declare function registerCollections(collections: CollectionRegistry): void;
/**
 * Get a collection by name from the registry.
 * Throws if the collection is not found.
 */
export declare function getCollection(name: string): CollectionDefinition<unknown, unknown, unknown>;
/**
 * Clear all registered collections (useful for testing).
 */
export declare function clearCollections(): void;
/**
 * Get all registered collection names.
 */
export declare function getCollectionNames(): string[];
//# sourceMappingURL=collection.d.ts.map