/**
 * Path Pattern Parsing and Matching
 *
 * Parses patterns like `{year}/{slug}.md` and provides:
 * - Type-level extraction of parameters
 * - Glob pattern generation
 * - Path matching to extract params
 * - Path building from params
 */

import { StandardSchema } from "piqit";

// =============================================================================
// Type-level Parameter Extraction
// =============================================================================

/**
 * Extract params from a path pattern string at the type level.
 * Params inside `<...>` optional segments become optional properties.
 *
 * @example
 * type Params = ExtractParams<'{year}/{slug}.md'>
 * // = { year: string } & { slug: string }
 *
 * type Params = ExtractParams<'{date}< {time}> {slug}.md'>
 * // = { date: string } & { time?: string } & { slug: string }
 */
export type ExtractParams<P extends string> =
  P extends `${infer Head}<${infer Opt}>${infer Rest}`
    ? ExtractParams<Head> & Partial<ExtractParams<Opt>> & ExtractParams<Rest>
    : P extends `${string}{${infer Param}}${infer Rest}`
      ? { [K in ExtractParamName<Param>]: string } & ExtractParams<Rest>
      : {}

type ExtractParamName<T extends string> = T extends `${infer Name}:${string}` ? Name : T

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
   * Generate all glob variants for a pattern with optional segments.
   * Each `<...>` segment doubles the variants (present/absent); variants
   * that omit a constrained param are pruned. Patterns without optional
   * segments yield a single glob.
   *
   * @param constraints - Optional param values to use instead of wildcards
   * @returns Deduplicated glob pattern strings
   */
  toGlobs(constraints?: Record<string, unknown>): string[]

  /**
   * Match a path against this pattern and extract params.
   * Params in unmatched optional segments are omitted from the result.
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
const PARAM_REGEX = /\{([a-zA-Z_][a-zA-Z0-9_]*)(?::([^{}]+))?\}/g

/**
 * Characters that need escaping in regex.
 */
const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g

/**
 * Characters with special meaning in glob patterns.
 * Literal text is escaped so paths containing e.g. `[id]` match verbatim.
 */
const GLOB_ESCAPE = /[*?[\]{}()!\\]/g

type PatternPart =
  | { kind: "literal"; value: string }
  | { kind: "param"; name: string; constraint?: string }

interface PatternChunk {
  optional: boolean
  parts: PatternPart[]
}

function parseParts(segment: string): PatternPart[] {
  const parts: PatternPart[] = []
  const regex = new RegExp(PARAM_REGEX.source, "g")
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(segment)) !== null) {
    if (match.index > cursor) {
      parts.push({ kind: "literal", value: segment.slice(cursor, match.index) })
    }
    parts.push({ kind: "param", name: match[1], constraint: match[2] || undefined })
    cursor = match.index + match[0].length
  }
  if (cursor < segment.length) {
    parts.push({ kind: "literal", value: segment.slice(cursor) })
  }
  return parts
}

/**
 * Split a pattern into chunks at `<...>` optional segment boundaries.
 * Nesting is not supported.
 */
function parseChunks(pattern: string): PatternChunk[] {
  const chunks: PatternChunk[] = []
  let cursor = 0
  while (cursor < pattern.length) {
    const open = pattern.indexOf("<", cursor)
    if (open === -1) {
      chunks.push({ optional: false, parts: parseParts(pattern.slice(cursor)) })
      break
    }
    const close = pattern.indexOf(">", open)
    if (close === -1) {
      throw new Error(`Unclosed optional segment in pattern: ${pattern}`)
    }
    const inner = pattern.slice(open + 1, close)
    if (inner.includes("<")) {
      throw new Error(`Nested optional segments are not supported: ${pattern}`)
    }
    if (open > cursor) {
      chunks.push({ optional: false, parts: parseParts(pattern.slice(cursor, open)) })
    }
    chunks.push({ optional: true, parts: parseParts(inner) })
    cursor = close + 1
  }
  return chunks
}

/**
 * Compile a path pattern string into a usable pattern object.
 *
 * Supports `{param}` placeholders, `{param:regex}` inline constraints, and
 * `<...>` optional segments (e.g. `'{date}< {time}> - {slug}.md'`).
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
  const chunks = parseChunks(pattern)

  const paramNames: string[] = []
  const paramChunk = new Map<string, PatternChunk>()
  for (const chunk of chunks) {
    for (const part of chunk.parts) {
      if (part.kind === "param") {
        paramNames.push(part.name)
        paramChunk.set(part.name, chunk)
      }
    }
  }

  // Build the match regex. Only param groups capture, so capture order
  // follows param order even with optional (non-capturing) groups.
  let regexPattern = ""
  for (const chunk of chunks) {
    let sub = ""
    for (const part of chunk.parts) {
      if (part.kind === "literal") {
        sub += part.value.replace(REGEX_ESCAPE, "\\$&")
      } else {
        // Non-greedy groups so adjacent params separated by literals
        // (e.g. "wp-{priority}-{name}.md") split as expected.
        sub += `(${part.constraint?.trim() || "[^/]+?"})`
      }
    }
    regexPattern += chunk.optional ? `(?:${sub})?` : sub
  }
  const matchRegex = new RegExp(`^${regexPattern}$`)

  function toGlobs(constraints?: Record<string, unknown>): string[] {
    const optionals = chunks.filter((c) => c.optional)
    const globs = new Set<string>()

    // Enumerate include/exclude combinations of optional chunks
    for (let mask = 0; mask < 1 << optionals.length; mask++) {
      const included = new Set<PatternChunk>()
      optionals.forEach((chunk, i) => {
        if (mask & (1 << i)) included.add(chunk)
      })

      // Prune variants that omit a constrained param
      const omitsConstrained = [...paramChunk.entries()].some(
        ([name, chunk]) =>
          chunk.optional &&
          !included.has(chunk) &&
          constraints?.[name] !== undefined &&
          constraints?.[name] !== null
      )
      if (omitsConstrained) continue

      let glob = ""
      for (const chunk of chunks) {
        if (chunk.optional && !included.has(chunk)) continue
        for (const part of chunk.parts) {
          if (part.kind === "literal") {
            glob += part.value.replace(GLOB_ESCAPE, "\\$&")
          } else {
            const value = constraints?.[part.name]
            glob +=
              value !== undefined && value !== null
                ? String(value).replace(GLOB_ESCAPE, "\\$&")
                : "*"
          }
        }
      }
      globs.add(glob)
    }

    return [...globs]
  }

  return {
    pattern,
    paramNames,
    toGlobs,

    toGlob(constraints?: Record<string, unknown>): string {
      const globs = toGlobs(constraints)
      if (globs.length > 1) {
        throw new Error(
          `Pattern has optional segments producing ${globs.length} glob variants; use toGlobs(): ${pattern}`
        )
      }
      return globs[0]
    },

    match(path: string): Record<string, string> | null {
      const result = matchRegex.exec(path)
      if (!result) return null

      const params: Record<string, string> = {}
      for (let i = 0; i < paramNames.length; i++) {
        if (result[i + 1] !== undefined) {
          params[paramNames[i]] = result[i + 1]
        }
      }
      return params
    },

    build(params: Record<string, string>): string {
      let result = ""
      for (const chunk of chunks) {
        if (chunk.optional) {
          const chunkParams = chunk.parts.filter((p) => p.kind === "param")
          if (!chunkParams.every((p) => p.kind === "param" && params[p.name] !== undefined)) {
            continue
          }
        }
        for (const part of chunk.parts) {
          if (part.kind === "literal") {
            result += part.value
          } else {
            const value = params[part.name]
            if (value === undefined) {
              throw new Error(`Missing required param: ${part.name}`)
            }
            result += value
          }
        }
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
): StandardSchema<Record<string, string>> {
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
