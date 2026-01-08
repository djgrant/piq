import type { BodyResolver } from "piqit";
export interface MarkdownResolverOptions {
    /**
     * Custom HTML renderer function.
     * If not provided, a basic markdown-to-HTML conversion is used.
     */
    render?: (markdown: string) => string | Promise<string>;
}
export interface MarkdownBody {
    /** Raw markdown content (without frontmatter) */
    raw: string;
    /** Rendered HTML content */
    html: string;
    /** Extracted headings */
    headings: Heading[];
}
export interface Heading {
    depth: number;
    text: string;
    slug: string;
}
/**
 * Create a body resolver that parses markdown content.
 * Extracts raw content, renders to HTML, and extracts headings.
 */
export declare function markdownResolver(options?: MarkdownResolverOptions): BodyResolver<MarkdownBody>;
//# sourceMappingURL=markdown-resolver.d.ts.map