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
export function defineCollection(definition) {
    return definition;
}
/**
 * Registry for storing collection definitions.
 * Used by the query builder to look up collections by name.
 */
let globalRegistry = {};
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
export function registerCollections(collections) {
    globalRegistry = { ...globalRegistry, ...collections };
}
/**
 * Get a collection by name from the registry.
 * Throws if the collection is not found.
 */
export function getCollection(name) {
    const collection = globalRegistry[name];
    if (!collection) {
        const available = Object.keys(globalRegistry);
        throw new Error(`Collection "${name}" not found. Available: ${available.join(", ") || "(none)"}`);
    }
    return collection;
}
/**
 * Clear all registered collections (useful for testing).
 */
export function clearCollections() {
    globalRegistry = {};
}
/**
 * Get all registered collection names.
 */
export function getCollectionNames() {
    return Object.keys(globalRegistry);
}
//# sourceMappingURL=collection.js.map