import type { SearchResolver } from "piqit";
export interface GlobResolverOptions {
    /**
     * Base directory for the collection (relative to cwd or absolute)
     */
    base?: string;
    /**
     * Path pattern with parameter placeholders.
     * Examples:
     *   - "{status}/{?date}/wp-{priority}-{name}.md"
     *   - "posts/{year}/{slug}.md"
     */
    path: string;
}
/**
 * Create a search resolver that uses glob patterns to find files
 * and extracts parameters from the matched paths.
 */
export declare function globResolver<TSearch extends Record<string, unknown>>(options: GlobResolverOptions): SearchResolver<TSearch>;
//# sourceMappingURL=glob-resolver.d.ts.map