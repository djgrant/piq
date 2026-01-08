import type { MetaResolver } from "piqit";
import { parse as parseYaml } from "yaml";

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
export function frontmatterResolver<TMeta extends Record<string, unknown>>(
  options: FrontmatterResolverOptions = {}
): MetaResolver<TMeta> {
  const { maxBytes = 4096 } = options;

  return {
    async resolve(path: string, fields?: (keyof TMeta)[]): Promise<TMeta> {
      const file = Bun.file(path);

      // Read only what we need for frontmatter
      const buffer = await file.slice(0, maxBytes).text();

      // Parse frontmatter
      const frontmatter = extractFrontmatter(buffer);

      if (!frontmatter) {
        return {} as TMeta;
      }

      // If specific fields requested, return only those
      if (fields && fields.length > 0) {
        const result: Partial<TMeta> = {};
        for (const field of fields) {
          if (field in frontmatter) {
            result[field] = frontmatter[field as string] as TMeta[keyof TMeta];
          }
        }
        return result as TMeta;
      }

      return frontmatter as TMeta;
    },
  };
}

/**
 * Extract and parse YAML frontmatter from content.
 * Returns null if no valid frontmatter found.
 */
function extractFrontmatter(content: string): Record<string, unknown> | null {
  // Must start with ---
  if (!content.startsWith("---")) {
    return null;
  }

  // Find closing ---
  const endIndex = content.indexOf("\n---", 3);
  if (endIndex === -1) {
    // Check for \r\n style
    const endIndexCrlf = content.indexOf("\r\n---", 3);
    if (endIndexCrlf === -1) {
      return null;
    }
    const yamlContent = content.slice(4, endIndexCrlf);
    return parseYaml(yamlContent) as Record<string, unknown>;
  }

  const yamlContent = content.slice(4, endIndex);
  return parseYaml(yamlContent) as Record<string, unknown>;
}

/**
 * Streaming frontmatter reader for very large files or many files.
 * Reads line-by-line until frontmatter ends.
 */
export async function readFrontmatterStreaming(
  path: string
): Promise<Record<string, unknown> | null> {
  const file = Bun.file(path);
  const stream = file.stream();
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let foundStart = false;
  let yamlLines: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);

      // Keep incomplete last line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!foundStart) {
          if (line === "---") {
            foundStart = true;
          } else if (line.trim() !== "") {
            // Non-empty line before frontmatter start - no frontmatter
            return null;
          }
        } else {
          if (line === "---") {
            // End of frontmatter
            const yamlContent = yamlLines.join("\n");
            return parseYaml(yamlContent) as Record<string, unknown>;
          }
          yamlLines.push(line);
        }
      }
    }

    // Handle remaining buffer
    if (foundStart && buffer === "---") {
      const yamlContent = yamlLines.join("\n");
      return parseYaml(yamlContent) as Record<string, unknown>;
    }

    return null;
  } finally {
    reader.releaseLock();
  }
}
