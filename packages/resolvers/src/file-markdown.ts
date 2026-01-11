/**
 * Filesystem Markdown Resolver
 *
 * A resolver for querying markdown files from the filesystem.
 * Optimized for reading only what's needed based on the query.
 */

import type { Resolver, StandardSchema, Infer } from "piqit"
import { compilePattern, createParamsSchema, type PathParams } from "./path-pattern"
import { parseFrontmatter } from "./frontmatter"
import { parseMarkdownBody, type BodyOptions, type BodyResult, type Heading } from "./markdown"
import path from "node:path"

// =============================================================================
// Types
// =============================================================================

/**
 * Options for creating a file markdown resolver.
 */
export interface FileMarkdownOptions<
  TPath extends string,
  TFrontmatter extends StandardSchema,
  TBody extends BodyOptions
> {
  /**
   * Base directory for finding files.
   * Can be absolute or relative to cwd.
   */
  base: string

  /**
   * Path pattern with {param} placeholders.
   * @example '{year}/{slug}.md'
   */
  path: TPath

  /**
   * Schema for validating frontmatter.
   * The schema's inferred type defines filter parameters.
   */
  frontmatter: TFrontmatter

  /**
   * Body parsing options.
   * @default { raw: false, html: false, headings: false }
   */
  body?: TBody
}

/**
 * The shape of results from a file markdown resolver.
 */
export interface FileMarkdownResult<
  TParams,
  TFrontmatter,
  TBody extends BodyResult
> {
  params: TParams
  frontmatter: TFrontmatter
  body: TBody
}

/**
 * Type for body shape based on options.
 */
type ComputedBodyShape<T extends BodyOptions | undefined> = T extends BodyOptions
  ? {
      raw: T["raw"] extends true ? string : never
      html: T["html"] extends true ? string : never
      headings: T["headings"] extends true ? Heading[] : never
    }
  : Record<string, never>

/**
 * Clean up body shape to remove never types.
 */
type CleanBodyShape<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K]
}

// =============================================================================
// Result Schema Factory
// =============================================================================

/**
 * Create a result schema for the resolver.
 * This schema validates the namespaced result shape.
 */
function createResultSchema<TFrontmatter, TBody extends BodyResult>(
  _paramNames: string[],
  frontmatterSchema: StandardSchema<TFrontmatter>,
  bodyOptions: BodyOptions
): StandardSchema<FileMarkdownResult<Record<string, string>, TFrontmatter, TBody>> {
  return {
    "~standard": {
      version: 1,
      vendor: "piqit/resolvers",
      validate(value: unknown) {
        if (value === null || typeof value !== "object") {
          return { issues: [{ message: "Expected object" }] }
        }

        const obj = value as Record<string, unknown>

        // Validate params
        if (obj.params == null || typeof obj.params !== "object") {
          return { issues: [{ message: "Missing params", path: ["params"] }] }
        }

        // Validate frontmatter using the provided schema
        const fmResult = frontmatterSchema["~standard"].validate(obj.frontmatter)
        if (fmResult.issues) {
          return {
            issues: fmResult.issues.map((issue) => ({
              ...issue,
              path: ["frontmatter", ...(issue.path || [])],
            })),
          }
        }

        // Validate body shape
        if (bodyOptions.raw || bodyOptions.html || bodyOptions.headings) {
          if (obj.body == null || typeof obj.body !== "object") {
            return { issues: [{ message: "Missing body", path: ["body"] }] }
          }
        }

        return { value: obj as unknown as FileMarkdownResult<Record<string, string>, TFrontmatter, TBody> }
      },
    },
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if any select paths require frontmatter data.
 */
function needsFrontmatter(selectPaths: string[]): boolean {
  return selectPaths.some((p) => p.startsWith("frontmatter.") || p === "frontmatter.*")
}

/**
 * Check if any select paths require body data.
 */
function needsBody(selectPaths: string[]): boolean {
  return selectPaths.some((p) => p.startsWith("body.") || p === "body.*")
}

/**
 * Check if any select paths require params.
 */
function needsParams(selectPaths: string[]): boolean {
  return selectPaths.some((p) => p.startsWith("params.") || p === "params.*")
}

/**
 * Get which body parts are needed based on select paths.
 */
function getNeededBodyParts(selectPaths: string[]): BodyOptions {
  const result: BodyOptions = {}

  for (const path of selectPaths) {
    if (path === "body.*") {
      // Need all body parts
      return { raw: true, html: true, headings: true }
    }
    if (path === "body.raw") result.raw = true
    if (path === "body.html") result.html = true
    if (path === "body.headings") result.headings = true
  }

  return result
}

/**
 * Check if filter constraints match frontmatter.
 * Simple equality check for now.
 */
function matchesFilter(
  frontmatter: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (frontmatter[key] !== value) {
      return false
    }
  }
  return true
}

// =============================================================================
// Resolver Factory
// =============================================================================

/**
 * Create a filesystem markdown resolver.
 *
 * @example
 * const postsResolver = fileMarkdown({
 *   base: 'content/posts',
 *   path: '{year}/{slug}.md',
 *   frontmatter: z.object({
 *     title: z.string(),
 *     status: z.enum(['draft', 'published']),
 *   }),
 *   body: { html: true, headings: true }
 * })
 */
export function fileMarkdown<
  TPath extends string,
  TFrontmatter extends StandardSchema,
  TBody extends BodyOptions = Record<string, never>
>(
  options: FileMarkdownOptions<TPath, TFrontmatter, TBody>
): Resolver<
  StandardSchema<Partial<PathParams<TPath>>>,
  TFrontmatter,
  StandardSchema<
    FileMarkdownResult<
      PathParams<TPath>,
      Infer<TFrontmatter>,
      CleanBodyShape<ComputedBodyShape<TBody>>
    >
  >
> {
  const pattern = compilePattern(options.path)
  const basePath = path.isAbsolute(options.base)
    ? options.base
    : path.join(process.cwd(), options.base)

  const bodyOptions: BodyOptions = options.body || {}

  // Create schemas
  const scanSchema = createParamsSchema(pattern) as StandardSchema<Partial<PathParams<TPath>>>
  const resultSchema = createResultSchema(
    pattern.paramNames,
    options.frontmatter,
    bodyOptions
  ) as StandardSchema<
    FileMarkdownResult<
      PathParams<TPath>,
      Infer<TFrontmatter>,
      CleanBodyShape<ComputedBodyShape<TBody>>
    >
  >

  return {
    schema: {
      scanParams: scanSchema,
      filterParams: options.frontmatter,
      result: resultSchema,
    },

    async resolve(spec) {
      const results: Array<
        Partial<
          FileMarkdownResult<
            PathParams<TPath>,
            Infer<TFrontmatter>,
            CleanBodyShape<ComputedBodyShape<TBody>>
          >
        >
      > = []

      // 1. Generate glob pattern from scan constraints
      const globPattern = pattern.toGlob(spec.scan as Record<string, unknown>)

      // 2. Find matching files using Bun.Glob
      const glob = new Bun.Glob(globPattern)
      const files: string[] = []

      for await (const file of glob.scan({ cwd: basePath, absolute: false })) {
        files.push(file)
      }

      // 3. Determine what we need to read
      const wantParams = needsParams(spec.select)
      const wantFrontmatter = needsFrontmatter(spec.select)
      const wantBody = needsBody(spec.select)
      const hasFilter = spec.filter && Object.keys(spec.filter).length > 0
      const neededBodyParts = wantBody ? getNeededBodyParts(spec.select) : {}

      // 4. Process each file
      for (const relativePath of files) {
        // Extract params from path
        const params = pattern.match(relativePath)
        if (!params) continue

        const fullPath = path.join(basePath, relativePath)

        // Read file content only if needed
        let content: string | null = null
        let frontmatter: Record<string, unknown> | null = null
        let body: BodyResult | null = null

        // If filtering or selecting frontmatter, we need to read it
        if (hasFilter || wantFrontmatter) {
          content = await Bun.file(fullPath).text()
          frontmatter = parseFrontmatter(content)

          if (!frontmatter) {
            frontmatter = {}
          }

          // Check filter constraints
          if (hasFilter && !matchesFilter(frontmatter, spec.filter as Record<string, unknown>)) {
            continue
          }
        }

        // If selecting body, parse it
        if (wantBody) {
          if (!content) {
            content = await Bun.file(fullPath).text()
          }

          // Only parse the body parts that are needed
          body = parseMarkdownBody(content, neededBodyParts)
        }

        // Build result with only requested fields
        const result: Partial<
          FileMarkdownResult<
            PathParams<TPath>,
            Infer<TFrontmatter>,
            CleanBodyShape<ComputedBodyShape<TBody>>
          >
        > = {}

        if (wantParams) {
          result.params = params as PathParams<TPath>
        }

        if (wantFrontmatter) {
          result.frontmatter = frontmatter as Infer<TFrontmatter>
        }

        if (wantBody && body) {
          result.body = body as CleanBodyShape<ComputedBodyShape<TBody>>
        }

        results.push(result)
      }

      return results
    },
  }
}
