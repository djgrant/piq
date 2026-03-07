/**
 * @piqit/resolvers - Resolver implementations for piq v2
 *
 * Provides resolvers for querying structured content:
 * - fileMarkdown: Query markdown files from filesystem (Node.js/Bun)
 * - staticContent: Query pre-compiled content (Edge/Workers)
 *
 * @packageDocumentation
 */

// =============================================================================
// Filesystem Resolver (Node.js/Bun only)
// =============================================================================

export { fileMarkdown } from "./file-markdown.js"
export type { FileMarkdownOptions, FileMarkdownResult } from "./file-markdown.js"

// =============================================================================
// Static Content Resolver (Edge/Workers compatible)
// =============================================================================

export { staticContent, staticResolver } from "./static.js"

// =============================================================================
// Path Pattern Utilities
// =============================================================================

export { compilePattern, createParamsSchema } from "./path-pattern.js"
export type {
  CompiledPattern,
  ExtractParams,
  PathParams,
} from "./path-pattern.js"

// =============================================================================
// Frontmatter Utilities
// =============================================================================

export {
  FrontmatterParseError,
  parseFrontmatter,
  parseFrontmatterStrict,
  parseFrontmatterPickStrict,
  extractFrontmatterString,
  getFrontmatterEndOffset,
  readFrontmatter,
  readFrontmatterPickStrict,
  readFrontmatterWithOffset,
} from "./frontmatter.js"

// =============================================================================
// Markdown Utilities
// =============================================================================

export {
  parseMarkdownBody,
  extractHeadings,
  slugify,
  markdownToHtml,
  readMarkdownBody,
  readParsedBody,
} from "./markdown.js"

export type {
  BodyOptions,
  BodyResult,
  BodyShape,
  Heading,
} from "./markdown.js"
