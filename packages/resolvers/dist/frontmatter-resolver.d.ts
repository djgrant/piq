import type { MetaResolver } from "piqit";
export interface FrontmatterResolverOptions {
    /**
     * Maximum bytes to read when looking for frontmatter.
     * Default: 4096 (4KB)
     */
    maxBytes?: number;
}
/**
 * Create a meta resolver that extracts YAML frontmatter from files.
 * Optimized for light I/O - reads only the frontmatter portion.
 */
export declare function frontmatterResolver<TMeta extends Record<string, unknown>>(options?: FrontmatterResolverOptions): MetaResolver<TMeta>;
/**
 * Streaming frontmatter reader for very large files or many files.
 * Reads line-by-line until frontmatter ends.
 */
export declare function readFrontmatterStreaming(path: string): Promise<Record<string, unknown> | null>;
//# sourceMappingURL=frontmatter-resolver.d.ts.map