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
export function markdownResolver(
  options: MarkdownResolverOptions = {}
): BodyResolver<MarkdownBody> {
  const { render = defaultRender } = options;

  return {
    async resolve(path: string, fields?: (keyof MarkdownBody)[]): Promise<MarkdownBody> {
      const file = Bun.file(path);
      const content = await file.text();

      // Strip frontmatter
      const raw = stripFrontmatter(content);

      // Determine which fields we need to compute
      const needsHtml = !fields || fields.includes("html");
      const needsHeadings = !fields || fields.includes("headings");
      const needsRaw = !fields || fields.includes("raw");

      const result: MarkdownBody = {
        raw: needsRaw ? raw : "",
        html: "",
        headings: [],
      };

      if (needsHtml) {
        result.html = await render(raw);
      }

      if (needsHeadings) {
        result.headings = extractHeadings(raw);
      }

      return result;
    },
  };
}

/**
 * Strip YAML frontmatter from content
 */
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) {
    return content;
  }

  // Find closing ---
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!match) {
    return content;
  }

  return content.slice(match[0].length);
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    // ATX-style headings: # Heading
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const depth = match[1].length;
      const text = match[2].trim();
      const slug = slugify(text);
      headings.push({ depth, text, slug });
    }
  }

  return headings;
}

/**
 * Generate a URL-friendly slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Default markdown renderer (basic implementation).
 * For production use, consider using a proper markdown parser.
 */
function defaultRender(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  html = html.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  html = html.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^\*\*\*$/gm, "<hr>");

  // Unordered lists (basic)
  html = html.replace(/^[\*\-]\s+(.+)$/gm, "<li>$1</li>");

  // Ordered lists (basic)
  html = html.replace(/^\d+\.\s+(.+)$/gm, "<li>$1</li>");

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Paragraphs (wrap remaining text blocks)
  html = html.replace(/^([^<\n].+)$/gm, "<p>$1</p>");

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html.trim();
}
