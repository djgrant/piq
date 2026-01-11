/**
 * Markdown Body Parsing
 *
 * Parses markdown body content to extract:
 * - Raw markdown text
 * - HTML (basic conversion)
 * - Headings with slugs
 */

import { getFrontmatterEndOffset } from "./frontmatter"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for parsing markdown body.
 */
export interface BodyOptions {
  /** Include raw markdown text */
  raw?: boolean
  /** Include HTML conversion */
  html?: boolean
  /** Extract headings with depth and slugs */
  headings?: boolean
}

/**
 * A heading extracted from markdown.
 */
export interface Heading {
  /** Heading depth (1-6) */
  depth: number
  /** Heading text content */
  text: string
  /** URL-safe slug */
  slug: string
}

/**
 * Result of parsing markdown body.
 */
export interface BodyResult {
  /** Raw markdown text (if requested) */
  raw?: string
  /** HTML content (if requested) */
  html?: string
  /** Extracted headings (if requested) */
  headings?: Heading[]
}

/**
 * Type-level shape of body result based on options.
 */
export type BodyShape<T extends BodyOptions> = {
  [K in keyof T as T[K] extends true ? K : never]: K extends "raw"
    ? string
    : K extends "html"
      ? string
      : K extends "headings"
        ? Heading[]
        : never
}

// =============================================================================
// Markdown Parsing
// =============================================================================

/**
 * Parse markdown body content.
 *
 * @param content - The full file content (including frontmatter if present)
 * @param options - What to extract from the markdown
 * @returns The requested body parts
 */
export function parseMarkdownBody(content: string, options: BodyOptions): BodyResult {
  // Strip frontmatter if present
  const bodyOffset = getFrontmatterEndOffset(content)
  const rawBody = content.slice(bodyOffset).replace(/^[\r\n]+/, "")

  const result: BodyResult = {}

  if (options.raw) {
    result.raw = rawBody
  }

  if (options.html) {
    result.html = markdownToHtml(rawBody)
  }

  if (options.headings) {
    result.headings = extractHeadings(rawBody)
  }

  return result
}

// =============================================================================
// Heading Extraction
// =============================================================================

/**
 * Regex to match ATX-style headings (# Heading).
 */
const HEADING_REGEX = /^(#{1,6})\s+(.+)$/gm

/**
 * Extract headings from markdown text.
 *
 * @param markdown - The raw markdown content
 * @returns Array of headings with depth, text, and slug
 */
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  let match: RegExpExecArray | null

  const regex = new RegExp(HEADING_REGEX.source, "gm")
  while ((match = regex.exec(markdown)) !== null) {
    const depth = match[1].length
    const text = match[2].trim()
    const slug = slugify(text)

    headings.push({ depth, text, slug })
  }

  return headings
}

/**
 * Convert text to a URL-safe slug.
 *
 * @param text - The text to slugify
 * @returns A URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/--+/g, "-") // Replace multiple dashes
    .replace(/^-|-$/g, "") // Trim dashes from ends
}

// =============================================================================
// Basic Markdown to HTML
// =============================================================================

/**
 * Convert markdown to HTML.
 *
 * This is a basic implementation that handles common patterns.
 * For production use, consider using a proper markdown parser.
 *
 * @param markdown - The raw markdown content
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown

  // Escape HTML entities first
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Headings (must be on their own line)
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>")

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>")
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>")

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr>")
  html = html.replace(/^\*\*\*+$/gm, "<hr>")

  // Unordered lists (simplified)
  html = html.replace(/^[-*+]\s+(.+)$/gm, "<li>$1</li>")

  // Ordered lists (simplified)
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>")

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n")

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")

  // Paragraphs (wrap remaining text blocks)
  // Split by double newlines and wrap non-block elements
  const blocks = html.split(/\n\n+/)
  html = blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ""
      // Don't wrap if already a block element
      if (
        /^<(h[1-6]|ul|ol|li|pre|blockquote|hr|p)/.test(trimmed) ||
        /^<\/?(h[1-6]|ul|ol|li|pre|blockquote)>$/.test(trimmed)
      ) {
        return trimmed
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`
    })
    .filter(Boolean)
    .join("\n")

  return html
}

// =============================================================================
// File Reading Utilities
// =============================================================================

/**
 * Read just the markdown body from a file (skipping frontmatter).
 *
 * @param path - Path to the markdown file
 * @returns The raw markdown body
 */
export async function readMarkdownBody(path: string): Promise<string> {
  const file = Bun.file(path)
  const content = await file.text()
  const bodyOffset = getFrontmatterEndOffset(content)
  return content.slice(bodyOffset).replace(/^\r?\n/, "")
}

/**
 * Read and parse markdown body from a file.
 *
 * @param path - Path to the markdown file
 * @param options - What to extract from the markdown
 * @returns The requested body parts
 */
export async function readParsedBody(path: string, options: BodyOptions): Promise<BodyResult> {
  const file = Bun.file(path)
  const content = await file.text()
  return parseMarkdownBody(content, options)
}
