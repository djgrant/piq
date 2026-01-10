/**
 * Path pattern parser for extracting typed parameters from file paths.
 *
 * Syntax:
 * - {param} — required parameter (matches one path segment or filename part)
 * - {?param} — optional parameter (matches zero or one segment)
 * - {...param} — splat/rest (captures remaining segments)
 */

export interface PathParam {
  name: string;
  type: "required" | "optional" | "splat";
  /** Position in the pattern (for ordering) */
  position: number;
}

export interface CompiledPattern {
  /** Original pattern string */
  pattern: string;
  /** Regex for matching paths */
  regex: RegExp;
  /** Parameter definitions in order */
  params: PathParam[];
  /** Static prefix (for glob optimization) */
  staticPrefix: string;
  /** Convert constraints to an optimized glob pattern */
  toGlob(constraints?: Record<string, unknown>): string;
}

/**
 * Token types for lexer
 */
type Token =
  | { type: "literal"; value: string }
  | { type: "param"; name: string; paramType: "required" | "optional" | "splat" };

/**
 * Tokenize a path pattern string
 */
export function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let remaining = pattern;

  while (remaining.length > 0) {
    // Check for parameter patterns
    const splatMatch = remaining.match(/^\{\.\.\.([^}]+)\}/);
    if (splatMatch) {
      tokens.push({ type: "param", name: splatMatch[1], paramType: "splat" });
      remaining = remaining.slice(splatMatch[0].length);
      continue;
    }

    const optionalMatch = remaining.match(/^\{\?([^}]+)\}/);
    if (optionalMatch) {
      tokens.push({
        type: "param",
        name: optionalMatch[1],
        paramType: "optional",
      });
      remaining = remaining.slice(optionalMatch[0].length);
      continue;
    }

    const requiredMatch = remaining.match(/^\{([^}]+)\}/);
    if (requiredMatch) {
      tokens.push({
        type: "param",
        name: requiredMatch[1],
        paramType: "required",
      });
      remaining = remaining.slice(requiredMatch[0].length);
      continue;
    }

    // Literal character
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

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a validation-only regex from a path pattern.
 * Uses non-capturing groups for faster matching when we only need
 * to validate if a path matches, without extracting parameters.
 */
export function compileValidationRegex(pattern: string): RegExp {
  const tokens = tokenize(pattern);
  let regexStr = "^";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "literal") {
      const nextToken = tokens[i + 1];
      if (
        token.value.endsWith("/") &&
        nextToken?.type === "param" &&
        nextToken.paramType === "optional"
      ) {
        const withoutSlash = token.value.slice(0, -1);
        if (withoutSlash) regexStr += escapeRegex(withoutSlash);
      } else {
        regexStr += escapeRegex(token.value);
      }
      i++;
    } else {
      // Use non-capturing groups for speed
      switch (token.paramType) {
        case "required":
          regexStr += "(?:[^/]+)";
          break;
        case "optional":
          regexStr += "(?:/[^/]+)?";
          break;
        case "splat":
          regexStr += "(?:.*)";
          break;
      }
      i++;
    }
  }

  regexStr += "$";
  return new RegExp(regexStr);
}

/**
 * Get the "stop" characters for a parameter - what comes after it.
 * This helps make the regex non-greedy where needed.
 */
function getStopChars(tokens: Token[], fromIndex: number): string {
  const nextToken = tokens[fromIndex + 1];
  if (!nextToken) return "";
  if (nextToken.type === "literal") {
    // Return the first character of the literal as stop char
    return nextToken.value[0] || "";
  }
  return "";
}

/**
 * Compile a path pattern into a regex and parameter definitions.
 * 
 * For optional parameters like {?date} in "posts/{?date}/{slug}.md":
 * - With date: "posts/2024-01-01/hello.md"
 * - Without date: "posts/hello.md"
 * 
 * The trick is to make the preceding "/" part of the optional group.
 */
export function compilePattern(pattern: string): CompiledPattern {
  const tokens = tokenize(pattern);
  const params: PathParam[] = [];
  let regexStr = "^";
  let staticPrefix = "";
  let foundParam = false;
  let position = 0;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === "literal") {
      // Check if this literal ends with / and next token is optional
      const nextToken = tokens[i + 1];
      if (
        token.value.endsWith("/") &&
        nextToken?.type === "param" &&
        nextToken.paramType === "optional"
      ) {
        // Add everything except the trailing /
        const withoutSlash = token.value.slice(0, -1);
        if (withoutSlash) {
          regexStr += escapeRegex(withoutSlash);
          if (!foundParam) {
            staticPrefix += withoutSlash;
          }
        }
        // The / will be handled as part of the optional group
      } else {
        regexStr += escapeRegex(token.value);
        if (!foundParam) {
          staticPrefix += token.value;
        }
      }
      i++;
    } else {
      // It's a param token
      foundParam = true;
      params.push({
        name: token.name,
        type: token.paramType,
        position: position++,
      });

      const stopChar = getStopChars(tokens, i);

      switch (token.paramType) {
        case "required":
          if (stopChar && stopChar !== "/") {
            // Use non-greedy match that stops at the delimiter
            // Match chars that are not / and not the stop char
            regexStr += `([^/${escapeRegex(stopChar)}]+)`;
          } else {
            // Match until / (path segment)
            regexStr += "([^/]+)";
          }
          break;
        case "optional":
          // Match optional segment with its preceding /
          regexStr += "(?:/([^/]+))?";
          break;
        case "splat":
          // Match remaining path segments
          regexStr += "(.*)";
          break;
      }
      i++;
    }
  }

  regexStr += "$";

  return {
    pattern,
    regex: new RegExp(regexStr),
    params,
    staticPrefix,
    toGlob(constraints?: Record<string, unknown>): string {
      return patternToGlob(tokens, constraints);
    },
  };
}

/**
 * Convert a pattern to a glob string, optionally applying constraints
 */
function patternToGlob(
  tokens: Token[],
  constraints?: Record<string, unknown>
): string {
  let glob = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === "literal") {
      const nextToken = tokens[i + 1];
      if (
        token.value.endsWith("/") &&
        nextToken?.type === "param" &&
        nextToken.paramType === "optional"
      ) {
        // Check if we have a constraint for the optional param
        const constraintValue = constraints?.[nextToken.name];
        if (constraintValue !== undefined && constraintValue !== null) {
          // Add full literal including /
          glob += token.value + String(constraintValue);
        } else {
          // Add without trailing /, let optional handle it
          glob += token.value.slice(0, -1) + "{,/*}";
        }
        i += 2; // Skip both literal and optional param
        continue;
      }
      glob += token.value;
      i++;
    } else {
      const constraintValue = constraints?.[token.name];

      if (constraintValue !== undefined && constraintValue !== null) {
        glob += String(constraintValue);
      } else {
        switch (token.paramType) {
          case "required":
            glob += "*";
            break;
          case "optional":
            // Should have been handled above with literal
            glob += "{,/*}";
            break;
          case "splat":
            glob += "**";
            break;
        }
      }
      i++;
    }
  }

  return glob;
}

/**
 * Match a path against a compiled pattern and extract parameters
 */
export function matchPattern(
  compiled: CompiledPattern,
  path: string
): Record<string, string> | null {
  const match = path.match(compiled.regex);
  if (!match) {
    return null;
  }

  const result: Record<string, string> = {};

  for (let i = 0; i < compiled.params.length; i++) {
    const param = compiled.params[i];
    const value = match[i + 1];

    if (value !== undefined && value !== "") {
      result[param.name] = value;
    } else if (param.type === "required") {
      // Required param missing - should not happen if regex matched
      return null;
    }
    // Optional params can be undefined
  }

  return result;
}

/**
 * Build a path from a pattern and parameters
 */
export function buildPath(
  compiled: CompiledPattern,
  params: Record<string, string>
): string {
  const tokens = tokenize(compiled.pattern);
  let path = "";
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    
    if (token.type === "literal") {
      const nextToken = tokens[i + 1];
      // Check if literal ends with / and next is an optional param
      if (
        token.value.endsWith("/") &&
        nextToken?.type === "param" &&
        nextToken.paramType === "optional"
      ) {
        const optValue = params[nextToken.name];
        if (optValue !== undefined) {
          // Include the / and the value
          path += token.value + optValue;
        } else {
          // Skip the / for absent optional
          path += token.value.slice(0, -1);
        }
        i += 2; // Skip literal and optional param
        continue;
      }
      path += token.value;
      i++;
    } else {
      const value = params[token.name];
      if (value !== undefined) {
        path += value;
      } else if (token.paramType === "required") {
        throw new Error(`Missing required parameter: ${token.name}`);
      }
      // Optional params without values should have been handled above
      i++;
    }
  }

  return path;
}
