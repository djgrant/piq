import { parse as parseYaml } from "yaml";
/**
 * Create a meta resolver that extracts YAML frontmatter from files.
 * Optimized for light I/O - reads only the frontmatter portion.
 */
export function frontmatterResolver(options = {}) {
    const { maxBytes = 4096 } = options;
    return {
        async resolve(path, fields) {
            const file = Bun.file(path);
            // Read only what we need for frontmatter
            const buffer = await file.slice(0, maxBytes).text();
            // Parse frontmatter
            const frontmatter = extractFrontmatter(buffer);
            if (!frontmatter) {
                return {};
            }
            // If specific fields requested, return only those
            if (fields && fields.length > 0) {
                const result = {};
                for (const field of fields) {
                    if (field in frontmatter) {
                        result[field] = frontmatter[field];
                    }
                }
                return result;
            }
            return frontmatter;
        },
    };
}
/**
 * Extract and parse YAML frontmatter from content.
 * Returns null if no valid frontmatter found.
 */
function extractFrontmatter(content) {
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
        return parseYaml(yamlContent);
    }
    const yamlContent = content.slice(4, endIndex);
    return parseYaml(yamlContent);
}
/**
 * Streaming frontmatter reader for very large files or many files.
 * Reads line-by-line until frontmatter ends.
 */
export async function readFrontmatterStreaming(path) {
    const file = Bun.file(path);
    const stream = file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let foundStart = false;
    let yamlLines = [];
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            // Keep incomplete last line in buffer
            buffer = lines.pop() || "";
            for (const line of lines) {
                if (!foundStart) {
                    if (line === "---") {
                        foundStart = true;
                    }
                    else if (line.trim() !== "") {
                        // Non-empty line before frontmatter start - no frontmatter
                        return null;
                    }
                }
                else {
                    if (line === "---") {
                        // End of frontmatter
                        const yamlContent = yamlLines.join("\n");
                        return parseYaml(yamlContent);
                    }
                    yamlLines.push(line);
                }
            }
        }
        // Handle remaining buffer
        if (foundStart && buffer === "---") {
            const yamlContent = yamlLines.join("\n");
            return parseYaml(yamlContent);
        }
        return null;
    }
    finally {
        reader.releaseLock();
    }
}
//# sourceMappingURL=frontmatter-resolver.js.map