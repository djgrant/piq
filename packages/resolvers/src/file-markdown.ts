/**
 * Filesystem Markdown Resolver
 *
 * A resolver for querying markdown files from the filesystem.
 * Optimized for reading only what's needed based on the query.
 */

import type { Resolver, StandardSchema, Infer } from "piqit"
import { compilePattern, createParamsSchema, type PathParams } from "./path-pattern.js"
import {
  FrontmatterParseError,
  parseFrontmatterStrict,
  parseFrontmatterPickStrict,
  readFrontmatterStrict,
  readFrontmatterPickStrict,
  type FrontmatterParseOptions,
} from "./frontmatter.js"
import { matchesFilter } from "./filter.js"
import {
  parseMarkdownBody,
  type BodyOptions,
  type BodyResult,
  type Heading,
} from "./markdown.js"
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
   * Low-level frontmatter parsing options.
   */
  frontmatterParse?: FrontmatterParseOptions

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
  /** Source file location, selectable as 'file.path' */
  file: { path: string }
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
      async validate(value: unknown) {
        if (value === null || typeof value !== "object") {
          return { issues: [{ message: "Expected object" }] }
        }

        const obj = value as Record<string, unknown>

        // Validate params
        if (obj.params == null || typeof obj.params !== "object") {
          return { issues: [{ message: "Missing params", path: ["params"] }] }
        }

        // Validate frontmatter using the provided schema
        const fmResult = await frontmatterSchema["~standard"].validate(obj.frontmatter)
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
 * Check if any select paths require the source file info.
 */
function needsFile(selectPaths: string[]): boolean {
  return selectPaths.some((p) => p.startsWith("file.") || p === "file.*")
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

function getFrontmatterKeys(selectPaths: string[], filter?: Record<string, unknown>): {
  wantAll: boolean
  keys: string[]
} {
  let wantAll = false
  const keys = new Set<string>()

  for (const p of selectPaths) {
    if (p === "frontmatter.*") {
      wantAll = true
      continue
    }
    if (p.startsWith("frontmatter.")) {
      const key = p.slice("frontmatter.".length).split(".")[0]
      if (key) keys.add(key)
    }
  }

  if (filter) {
    for (const key of Object.keys(filter)) {
      if (key) keys.add(key)
    }
  }

  return { wantAll, keys: [...keys] }
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
  const frontmatterParseOptions = options.frontmatterParse

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

  // Frontmatter keys are introspectable when the schema is a Zod object
  // (StandardSchema itself has no field enumeration)
  const frontmatterShape = (options.frontmatter as { shape?: Record<string, unknown> }).shape
  const filterKeys = frontmatterShape ? Object.keys(frontmatterShape) : undefined

  const selectPaths = [
    ...pattern.paramNames.map((name) => `params.${name}`),
    ...(filterKeys?.map((key) => `frontmatter.${key}`) ?? ["frontmatter.*"]),
    ...(["raw", "html", "headings"] as const)
      .filter((part) => bodyOptions[part])
      .map((part) => `body.${part}`),
    "file.path",
  ]

  return {
    meta: {
      scanKeys: [...pattern.paramNames],
      filterKeys,
      selectPaths,
    },

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

      // 1. Generate glob variants from scan constraints (optional path
      //    segments produce multiple globs)
      const scanConstraints = spec.scan as Record<string, unknown> | undefined
      const globPatterns = pattern.toGlobs(scanConstraints)

      // 2. Find matching files using Bun.Glob, deduped across variants
      const fileSet = new Set<string>()
      for (const globPattern of globPatterns) {
        const glob = new Bun.Glob(globPattern)
        for await (const file of glob.scan({ cwd: basePath, absolute: false })) {
          fileSet.add(file)
        }
      }
      const files = [...fileSet]

      // 3. Determine what we need to read
      const wantParams = needsParams(spec.select)
      const wantFile = needsFile(spec.select)
      const wantFrontmatter = needsFrontmatter(spec.select)
      const wantBody = needsBody(spec.select)
      const hasFilter = spec.filter && Object.keys(spec.filter).length > 0
      const neededBodyParts = wantBody ? getNeededBodyParts(spec.select) : {}
      const { wantAll: wantAllFrontmatter, keys: frontmatterKeys } = getFrontmatterKeys(
        spec.select,
        (spec.filter as Record<string, unknown> | undefined) ?? undefined
      )

      // 4. Process each file
      for (const relativePath of files) {
        // Extract params from path
        const params = pattern.match(relativePath)
        if (!params) continue

        // Variant globs can over-match, so re-verify scan constraints
        // against the extracted params
        if (scanConstraints) {
          let mismatch = false
          for (const [key, value] of Object.entries(scanConstraints)) {
            if (value !== undefined && value !== null && params[key] !== String(value)) {
              mismatch = true
              break
            }
          }
          if (mismatch) continue
        }

        const fullPath = path.join(basePath, relativePath)

        // Read file content only if needed
        let content: string | null = null
        let frontmatter: Record<string, unknown> | null = null
        let body: BodyResult | null = null

        // If filtering or selecting frontmatter, we need to read it
        if (hasFilter || wantFrontmatter) {
          try {
            if (wantBody) {
              content = await Bun.file(fullPath).text()
              frontmatter = wantAllFrontmatter || frontmatterKeys.length === 0
                ? parseFrontmatterStrict(content, fullPath, frontmatterParseOptions)
                : parseFrontmatterPickStrict(content, frontmatterKeys, fullPath, frontmatterParseOptions)
            } else {
              frontmatter = wantAllFrontmatter || frontmatterKeys.length === 0
                ? await readFrontmatterStrict(fullPath, 8192, frontmatterParseOptions)
                : await readFrontmatterPickStrict(fullPath, frontmatterKeys, 8192, frontmatterParseOptions)
            }
          } catch (error) {
            if (error instanceof FrontmatterParseError) {
              throw error
            }
            throw new FrontmatterParseError(
              error instanceof Error ? error.message : String(error),
              fullPath
            )
          }

          if (!frontmatter) {
            throw new FrontmatterParseError(
              "missing YAML frontmatter block",
              fullPath
            )
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

        if (wantFile) {
          result.file = { path: path.join(options.base, relativePath) }
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
