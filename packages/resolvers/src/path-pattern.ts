/**
 * Path Pattern Parsing and Matching
 *
 * Parses patterns like `{year}/{slug}.md` and provides:
 * - Type-level extraction of parameters
 * - Glob pattern generation
 * - Path matching to extract params
 * - Path building from params
 */

// =============================================================================
// Type-level Parameter Extraction
// =============================================================================

/**
 * Extract params from a path pattern string at the type level.
 *
 * @example
 * type Params = ExtractParams<'{year}/{slug}.md'>
 * // = { year: string } & { slug: string }
 */
export type ExtractParams<P extends string> = P extends `${string}{${infer Param}}${infer Rest}`
  ? { [K in Param]: string } & ExtractParams<Rest>
  : {}

/**
 * Simplify a type by flattening intersections.
 * Converts { a: string } & { b: string } to { a: string; b: string }
 */
export type Simplify<T> = { [K in keyof T]: T[K] }

/**
 * Extract and simplify params from a path pattern.
 */
export type PathParams<P extends string> = Simplify<ExtractParams<P>>

// =============================================================================
// Compiled Pattern Interface
// =============================================================================

/**
 * A compiled path pattern that can match paths and generate globs.
 */
export interface CompiledPattern {
  /**
   * The original pattern string.
   */
  pattern: string

  /**
   * The extracted parameter names.
   */
  paramNames: string[]

  /**
   * Generate a glob pattern, optionally constraining specific params.
   *
   * @param constraints - Optional param values to use instead of wildcards
   * @returns A glob pattern string
   *
   * @example
   * pattern.toGlob()  // '** / *.md' (with {year}/{slug}.md)
   * pattern.toGlob({ year: '2024' })  // '2024/*.md'
   */
  toGlob(constraints?: Record<string, unknown>): string

  /**
   * Match a path against this pattern and extract params.
   *
   * @param path - The file path to match (relative to base)
   * @returns The extracted params, or null if no match
   *
   * @example
   * pattern.match('2024/hello-world.md')  // { year: '2024', slug: 'hello-world' }
   * pattern.match('invalid')  // null
   */
  match(path: string): Record<string, string> | null

  /**
   * Build a path from params.
   *
   * @param params - The param values
   * @returns The constructed path
   *
   * @example
   * pattern.build({ year: '2024', slug: 'hello' })  // '2024/hello.md'
   */
  build(params: Record<string, string>): string
}

// =============================================================================
// Pattern Parsing
// =============================================================================

/**
 * Regex to match parameter placeholders in patterns.
 * Matches {paramName} where paramName is alphanumeric + underscores.
 */
const PARAM_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g

/**
 * Characters that need escaping in regex.
 */
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g

/**
 * Compile a path pattern string into a usable pattern object.
 *
 * @param pattern - The pattern string like '{year}/{slug}.md'
 * @returns A CompiledPattern instance
 *
 * @example
 * const pattern = compilePattern('{year}/{slug}.md')
 * pattern.toGlob()  // '** / *.md'
 * pattern.match('2024/hello.md')  // { year: '2024', slug: 'hello' }
 */
export function compilePattern(pattern: string): CompiledPattern {
  // Extract all parameter names in order
  const paramNames: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(PARAM_REGEX.source, "g")
  while ((match = regex.exec(pattern)) !== null) {
    paramNames.push(match[1])
  }

  // Build the match regex by replacing {param} with capturing groups
  // Each param can match anything except path separators
  const regexPattern = pattern
    .replace(REGEX_ESCAPE, (char) => {
      // Don't escape our param placeholders - we'll handle them separately
      if (char === "{" || char === "}") return char
      return "\\" + char
    })
    .replace(PARAM_REGEX, "([^/]+)")

  const matchRegex = new RegExp(`^${regexPattern}$`)

  return {
    pattern,
    paramNames,

    toGlob(constraints?: Record<string, unknown>): string {
      let glob = pattern

      // Replace each param with either its constrained value or a wildcard
      for (const name of paramNames) {
        const value = constraints?.[name]
        if (value !== undefined && value !== null) {
          // Use the constrained value
          glob = glob.replace(`{${name}}`, String(value))
        } else {
          // Use a wildcard - * matches anything except /
          glob = glob.replace(`{${name}}`, "*")
        }
      }

      return glob
    },

    match(path: string): Record<string, string> | null {
      const result = matchRegex.exec(path)
      if (!result) return null

      const params: Record<string, string> = {}
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = result[i + 1]
      }
      return params
    },

    build(params: Record<string, string>): string {
      let result = pattern
      for (const name of paramNames) {
        const value = params[name]
        if (value === undefined) {
          throw new Error(`Missing required param: ${name}`)
        }
        result = result.replace(`{${name}}`, value)
      }
      return result
    },
  }
}

// =============================================================================
// Schema for Path Params
// =============================================================================

/**
 * Create a StandardSchema for path params extracted from a pattern.
 * This is used by the resolver to expose scanParams to piq core.
 *
 * @param pattern - The compiled pattern
 * @returns A StandardSchema that validates param objects
 */
export function createParamsSchema(
  pattern: CompiledPattern
): import("piqit").StandardSchema<Record<string, string>> {
  return {
    "~standard": {
      version: 1,
      vendor: "piqit/resolvers",
      validate(value: unknown) {
        if (value === null || typeof value !== "object") {
          return {
            issues: [{ message: "Expected object" }],
          }
        }

        const obj = value as Record<string, unknown>

        // All params should be strings if present
        for (const name of pattern.paramNames) {
          const val = obj[name]
          if (val !== undefined && typeof val !== "string") {
            return {
              issues: [{ message: `Param ${name} must be a string`, path: [name] }],
            }
          }
        }

        return { value: obj as Record<string, string> }
      },
    },
  }
}
