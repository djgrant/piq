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

export { fileMarkdown } from "./file-markdown"
export type { FileMarkdownOptions, FileMarkdownResult } from "./file-markdown"

// =============================================================================
// Static Content Resolver (Edge/Workers compatible)
// =============================================================================

export { staticContent, staticResolver } from "./static"

// =============================================================================
// Path Pattern Utilities
// =============================================================================

export { compilePattern, createParamsSchema } from "./path-pattern"
export type {
  CompiledPattern,
  ExtractParams,
  PathParams,
} from "./path-pattern"

// =============================================================================
// Frontmatter Utilities
// =============================================================================

export {
  FrontmatterParseError,
  parseFrontmatter,
  parseFrontmatterStrict,
  extractFrontmatterString,
  getFrontmatterEndOffset,
  readFrontmatter,
  readFrontmatterWithOffset,
} from "./frontmatter"

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
} from "./markdown"

export type {
  BodyOptions,
  BodyResult,
  BodyShape,
  Heading,
} from "./markdown"
