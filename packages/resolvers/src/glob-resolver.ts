import { Glob } from "bun";
import { join, relative } from "path";
import type { SearchResolver, SearchResult } from "piqit";
import { compilePattern, matchPattern } from "piqit";

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
export function globResolver<TSearch extends Record<string, unknown>>(
  options: GlobResolverOptions
): SearchResolver<TSearch> {
  const { base = ".", path: pathPattern } = options;
  const compiled = compilePattern(pathPattern);

  return {
    async search(constraints?: Partial<TSearch>): Promise<SearchResult<TSearch>[]> {
      // Resolve base directory
      const baseDir = base.startsWith("/") ? base : join(process.cwd(), base);

      // Generate optimized glob pattern from constraints
      const globPattern = compiled.toGlob(constraints as Record<string, unknown> | undefined);

      // Scan for matching files
      const glob = new Glob(globPattern);
      const results: SearchResult<TSearch>[] = [];

      for await (const file of glob.scan({ cwd: baseDir, absolute: true, dot: true })) {
        // Get path relative to base for pattern matching
        const relativePath = relative(baseDir, file);

        // Match against the pattern and extract params
        const params = matchPattern(compiled, relativePath);

        if (params) {
          // Apply any additional constraint filtering
          // (glob optimization may not capture all constraints precisely)
          if (constraints && !matchesConstraints(params, constraints)) {
            continue;
          }

          results.push({
            path: file,
            params: params as TSearch,
          });
        }
      }

      return results;
    },

    getPath(params: TSearch): string {
      const baseDir = base.startsWith("/") ? base : join(process.cwd(), base);
      const tokens = tokenizePattern(pathPattern);
      let path = "";

      for (const token of tokens) {
        if (token.type === "literal") {
          path += token.value;
        } else {
          const value = params[token.name as keyof TSearch];
          if (value !== undefined) {
            path += String(value);
          } else if (token.paramType === "required") {
            throw new Error(`Missing required parameter: ${token.name}`);
          }
        }
      }

      return join(baseDir, path);
    },
  };
}

/**
 * Check if extracted params match the given constraints
 */
function matchesConstraints(
  params: Record<string, string>,
  constraints: Record<string, unknown>
): boolean {
  for (const [key, constraintValue] of Object.entries(constraints)) {
    if (constraintValue === undefined || constraintValue === null) {
      continue;
    }

    const paramValue = params[key];
    if (paramValue === undefined) {
      return false;
    }

    // String comparison
    if (String(paramValue) !== String(constraintValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Token types (duplicated from core for standalone use)
 */
type Token =
  | { type: "literal"; value: string }
  | { type: "param"; name: string; paramType: "required" | "optional" | "splat" };

/**
 * Tokenize pattern (simplified version for path building)
 */
function tokenizePattern(pattern: string): Token[] {
  const tokens: Token[] = [];
  let remaining = pattern;

  while (remaining.length > 0) {
    const splatMatch = remaining.match(/^\{\.\.\.([^}]+)\}/);
    if (splatMatch) {
      tokens.push({ type: "param", name: splatMatch[1], paramType: "splat" });
      remaining = remaining.slice(splatMatch[0].length);
      continue;
    }

    const optionalMatch = remaining.match(/^\{\?([^}]+)\}/);
    if (optionalMatch) {
      tokens.push({ type: "param", name: optionalMatch[1], paramType: "optional" });
      remaining = remaining.slice(optionalMatch[0].length);
      continue;
    }

    const requiredMatch = remaining.match(/^\{([^}]+)\}/);
    if (requiredMatch) {
      tokens.push({ type: "param", name: requiredMatch[1], paramType: "required" });
      remaining = remaining.slice(requiredMatch[0].length);
      continue;
    }

    const lastToken = tokens[tokens.length - 1];
    if (lastToken && lastToken.type === "literal") {
      lastToken.value += remaining[0];
    } else {
      tokens.push({ type: "literal", value: remaining[0] });
    }
    remaining = remaining.slice(1);
  }

  return tokens;
}
