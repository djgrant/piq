/**
 * @piqit/resolvers - Resolver implementations for piq v2
 *
 * Provides filesystem resolvers for querying structured content:
 * - fileMarkdown: Query markdown files with frontmatter
 *
 * @packageDocumentation
 */

// =============================================================================
// Main Resolver
// =============================================================================

export { fileMarkdown } from "./file-markdown"
export type { FileMarkdownOptions, FileMarkdownResult } from "./file-markdown"

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
  parseFrontmatter,
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
