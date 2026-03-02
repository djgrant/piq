/**
 * YAML Frontmatter Extraction
 *
 * Optimized frontmatter parsing that reads only what's needed.
 */

// =============================================================================
// Frontmatter Parsing
// =============================================================================

/**
 * Regex to match YAML frontmatter block at the start of content.
 * Matches --- at start, captures content, ends with ---
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/
const FRONTMATTER_FENCE_ANYWHERE_REGEX = /(^|\r?\n)---\r?\n/

export class FrontmatterParseError extends Error {
  constructor(
    public readonly reason: string,
    public readonly filePath?: string
  ) {
    const location = filePath ? ` in ${filePath}` : ""
    super(`Malformed frontmatter${location}: ${reason}`)
    this.name = "FrontmatterParseError"
  }
}

export type FrontmatterPickKeys = readonly string[]

export interface FrontmatterParseOptions {
  /**
   * When true, coerces ISO-ish date strings to `toISOString()`.
   *
   * Defaults to false to avoid surprising equality semantics and extra CPU.
   */
  coerceDates?: boolean
}

function normalizeFrontmatterOptions(
  options?: FrontmatterParseOptions
): Required<FrontmatterParseOptions> {
  return {
    coerceDates: options?.coerceDates ?? false,
  }
}

/**
 * Parse YAML frontmatter from content string.
 *
 * Uses a simple YAML parser that handles common cases:
 * - key: value
 * - key: "quoted value"
 * - key: 'quoted value'
 * - key: [array, items]
 * - Multi-line values with proper indentation
 *
 * @param content - The file content (or just the frontmatter portion)
 * @returns The parsed frontmatter object, or null if not found
 */
export function parseFrontmatter(
  content: string,
  options?: FrontmatterParseOptions
): Record<string, unknown> | null {
  const match = FRONTMATTER_REGEX.exec(content)
  if (!match) return null

  const yaml = match[1]
  return parseSimpleYaml(yaml, options)
}

/**
 * Parse YAML frontmatter with strict malformed-data checks.
 *
 * - Returns null when no frontmatter is present.
 * - Throws FrontmatterParseError when frontmatter fences are malformed.
 */
export function parseFrontmatterStrict(
  content: string,
  filePath?: string,
  options?: FrontmatterParseOptions
): Record<string, unknown> | null {
  const hasFrontmatterAtStart = content.startsWith("---\n") || content.startsWith("---\r\n")
  if (hasFrontmatterAtStart) {
    const match = FRONTMATTER_REGEX.exec(content)
    if (!match) {
      throw new FrontmatterParseError("opening frontmatter fence is not closed", filePath)
    }
    return parseSimpleYaml(match[1], options)
  }

  if (content.startsWith("---")) {
    throw new FrontmatterParseError(
      "opening frontmatter fence must be followed by a newline",
      filePath
    )
  }

  if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(content)) {
    throw new FrontmatterParseError(
      "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
      filePath
    )
  }

  return null
}

/**
 * Parse just a subset of frontmatter keys with strict malformed-data checks.
 *
 * This is intended for query-time optimization when you only need a few keys
 * (filter/select), rather than parsing every key eagerly.
 */
export function parseFrontmatterPickStrict(
  content: string,
  keys: FrontmatterPickKeys,
  filePath?: string,
  options?: FrontmatterParseOptions
): Record<string, unknown> | null {
  const hasFrontmatterAtStart = content.startsWith("---\n") || content.startsWith("---\r\n")
  if (hasFrontmatterAtStart) {
    const match = FRONTMATTER_REGEX.exec(content)
    if (!match) {
      throw new FrontmatterParseError("opening frontmatter fence is not closed", filePath)
    }
    return parseSimpleYamlPick(match[1], keys, options)
  }

  if (content.startsWith("---")) {
    throw new FrontmatterParseError(
      "opening frontmatter fence must be followed by a newline",
      filePath
    )
  }

  if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(content)) {
    throw new FrontmatterParseError(
      "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
      filePath
    )
  }

  return null
}

/**
 * Extract just the frontmatter portion from content.
 * Returns the raw YAML string without the --- delimiters.
 *
 * @param content - The file content
 * @returns The YAML content, or null if no frontmatter
 */
export function extractFrontmatterString(content: string): string | null {
  const match = FRONTMATTER_REGEX.exec(content)
  return match ? match[1] : null
}

/**
 * Get the byte offset where frontmatter ends (after closing ---).
 * Returns 0 if no frontmatter found.
 *
 * @param content - The file content
 * @returns Byte offset after frontmatter, or 0
 */
export function getFrontmatterEndOffset(content: string): number {
  const match = FRONTMATTER_REGEX.exec(content)
  if (!match) return 0
  return match[0].length
}

// =============================================================================
// Simple YAML Parser
// =============================================================================

/**
 * Parse simple YAML into an object.
 * Handles the common patterns found in markdown frontmatter.
 */
function parseSimpleYaml(
  yaml: string,
  options?: FrontmatterParseOptions
): Record<string, unknown> {
  const normalizedOptions = normalizeFrontmatterOptions(options)
  const result: Record<string, unknown> = {}
  const lines = yaml.split(/\r?\n/)

  let currentKey: string | null = null
  let currentValue: string[] = []
  let inMultiline = false
  let inBlockArray = false
  let blockArrayItems: unknown[] = []
  let multilineIndent = 0

  function commitValue() {
    if (currentKey) {
      if (inBlockArray) {
        // Commit block array
        result[currentKey] = blockArrayItems
        blockArrayItems = []
        inBlockArray = false
      } else if (currentValue.length === 1) {
        result[currentKey] = parseYamlValue(currentValue[0], normalizedOptions)
      } else if (currentValue.length > 1) {
        result[currentKey] = currentValue.join("\n")
      }
    }
    currentKey = null
    currentValue = []
    inMultiline = false
  }

  for (const line of lines) {
    // Check for block array item (- value)
    const arrayItemMatch = line.match(/^(\s+)-\s+(.*)$/)
    if (arrayItemMatch && currentKey && (inBlockArray || (inMultiline && currentValue.length === 0))) {
      inBlockArray = true
      inMultiline = false
      const itemValue = arrayItemMatch[2].trim()
      blockArrayItems.push(parseYamlValue(itemValue, normalizedOptions))
      continue
    }

    // Check for key: value pattern
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)

    if (keyMatch && !inMultiline) {
      // Commit previous key-value
      commitValue()

      currentKey = keyMatch[1]
      const valueStr = keyMatch[2].trim()

      if (valueStr === "" || valueStr === "|" || valueStr === ">") {
        // Multiline value or block array starts on next line
        inMultiline = true
        multilineIndent = 0
      } else {
        currentValue = [valueStr]
      }
    } else if (inMultiline && currentKey && !inBlockArray) {
      // Continuation of multiline value
      if (line.trim() === "") {
        currentValue.push("")
      } else {
        const indent = line.search(/\S/)
        if (indent > 0) {
          if (multilineIndent === 0) {
            multilineIndent = indent
          }
          currentValue.push(line.slice(multilineIndent))
        } else {
          // No indent means new key or end of multiline
          commitValue()
          // Re-process this line
          const reKeyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
          if (reKeyMatch) {
            currentKey = reKeyMatch[1]
            const valueStr = reKeyMatch[2].trim()
            if (valueStr === "" || valueStr === "|" || valueStr === ">") {
              inMultiline = true
              multilineIndent = 0
            } else {
              currentValue = [valueStr]
            }
          }
        }
      }
    } else if (currentKey && line.trim() === "") {
      // Empty line after value - keep going
    } else if (!currentKey && line.trim() !== "") {
      // New key-value
      const newKeyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
      if (newKeyMatch) {
        currentKey = newKeyMatch[1]
        const valueStr = newKeyMatch[2].trim()
        if (valueStr === "" || valueStr === "|" || valueStr === ">") {
          inMultiline = true
          multilineIndent = 0
        } else {
          currentValue = [valueStr]
        }
      }
    }
  }

  // Commit final value
  commitValue()

  return result
}

/**
 * Parse a subset of simple YAML keys into an object.
 *
 * Uses the same parsing rules as `parseSimpleYaml`, but stops once all requested
 * keys have been found and committed.
 */
function parseSimpleYamlPick(
  yaml: string,
  keys: FrontmatterPickKeys,
  options?: FrontmatterParseOptions
): Record<string, unknown> {
  const normalizedOptions = normalizeFrontmatterOptions(options)
  const want = new Set(keys)
  const remaining = new Set(keys)
  const result: Record<string, unknown> = {}
  if (remaining.size === 0) return result

  const lines = yaml.split(/\r?\n/)

  let currentKey: string | null = null
  let currentValue: string[] = []
  let inMultiline = false
  let inBlockArray = false
  let blockArrayItems: unknown[] = []
  let multilineIndent = 0

  function commitValue() {
    if (!currentKey) return

    if (want.has(currentKey)) {
      if (inBlockArray) {
        result[currentKey] = blockArrayItems
      } else if (currentValue.length === 1) {
        result[currentKey] = parseYamlValue(currentValue[0], normalizedOptions)
      } else if (currentValue.length > 1) {
        result[currentKey] = currentValue.join("\n")
      }
      remaining.delete(currentKey)
    }

    currentKey = null
    currentValue = []
    inMultiline = false
    inBlockArray = false
    blockArrayItems = []
    multilineIndent = 0
  }

  for (const line of lines) {
    const arrayItemMatch = line.match(/^(\s+)-\s+(.*)$/)
    if (arrayItemMatch && currentKey && (inBlockArray || (inMultiline && currentValue.length === 0))) {
      inBlockArray = true
      inMultiline = false
      const itemValue = arrayItemMatch[2].trim()
      if (want.has(currentKey)) {
        blockArrayItems.push(parseYamlValue(itemValue, normalizedOptions))
      }
      continue
    }

    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
    if (keyMatch && !inMultiline) {
      commitValue()
      if (remaining.size === 0) break

      currentKey = keyMatch[1]
      const valueStr = keyMatch[2].trim()

      if (valueStr === "" || valueStr === "|" || valueStr === ">") {
        inMultiline = true
        multilineIndent = 0
      } else {
        currentValue = [valueStr]
      }
      continue
    }

    if (inMultiline && currentKey && !inBlockArray) {
      if (line.trim() === "") {
        if (want.has(currentKey)) currentValue.push("")
        continue
      }

      const indent = line.search(/\S/)
      if (indent > 0) {
        if (multilineIndent === 0) {
          multilineIndent = indent
        }
        if (want.has(currentKey)) currentValue.push(line.slice(multilineIndent))
        continue
      }

      // No indent: multiline ended, re-process as a new key
      commitValue()
      if (remaining.size === 0) break
      const reKeyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
      if (reKeyMatch) {
        currentKey = reKeyMatch[1]
        const valueStr = reKeyMatch[2].trim()
        if (valueStr === "" || valueStr === "|" || valueStr === ">") {
          inMultiline = true
          multilineIndent = 0
        } else {
          currentValue = [valueStr]
        }
      }
      continue
    }
  }

  commitValue()
  return result
}

/**
 * Parse a single YAML value.
 */
function parseYamlValue(
  value: string,
  options: Required<FrontmatterParseOptions>
): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  // Check for array
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1)
    if (inner.trim() === "") return []
    return inner.split(",").map((item) => parseYamlValue(item.trim(), options))
  }

  // Check for booleans
  if (value === "true") return true
  if (value === "false") return false

  // Check for null
  if (value === "null" || value === "~") return null

  // Check for numbers
  const num = Number(value)
  if (!isNaN(num) && value !== "") return num

  if (options.coerceDates) {
    // Check for dates (ISO-ish format)
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) return date.toISOString()
    }
  }

  return value
}

// =============================================================================
// Optimized File Reading
// =============================================================================

/**
 * Read only the frontmatter from a file, optimized for large files.
 *
 * Reads incrementally until we find the closing ---, avoiding reading
 * the entire file into memory.
 *
 * @param path - Path to the markdown file
 * @param maxBytes - Maximum bytes to read looking for frontmatter (default 8KB)
 * @returns The parsed frontmatter, or null if not found
 */
export async function readFrontmatter(
  path: string,
  maxBytes = 8192,
  options?: FrontmatterParseOptions
): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path)
    const size = file.size

    // Read up to maxBytes or file size
    const bytesToRead = Math.min(maxBytes, size)
    const buffer = await file.slice(0, bytesToRead).text()

    return parseFrontmatter(buffer, options)
  } catch {
    return null
  }
}

/**
 * Read and parse frontmatter with strict malformed-data checks.
 *
 * Reads incrementally and stops once frontmatter is complete when it starts
 * at byte 0. Falls back to scanning the whole file only when needed to
 * preserve strict fence-position behavior.
 */
export async function readFrontmatterStrict(
  path: string,
  chunkSize = 8192,
  options?: FrontmatterParseOptions
): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path)
    const size = file.size
    if (size === 0) return null

    const firstReadSize = Math.min(chunkSize, size)
    const firstChunk = await file.slice(0, firstReadSize).text()

    const hasFrontmatterAtStart = firstChunk.startsWith("---\n") || firstChunk.startsWith("---\r\n")

    if (hasFrontmatterAtStart) {
      let content = firstChunk
      let offset = firstReadSize

      while (!/\r?\n---/.test(content)) {
        if (offset >= size) {
          throw new FrontmatterParseError("opening frontmatter fence is not closed", path)
        }

        const end = Math.min(offset + chunkSize, size)
        const nextChunk = await file.slice(offset, end).text()
        content += nextChunk
        offset = end
      }

      return parseFrontmatterStrict(content, path, options)
    }

    if (firstChunk.startsWith("---")) {
      throw new FrontmatterParseError(
        "opening frontmatter fence must be followed by a newline",
        path
      )
    }

    let carry = firstChunk.slice(-8)
    if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(firstChunk)) {
      throw new FrontmatterParseError(
        "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
        path
      )
    }

    for (let offset = firstReadSize; offset < size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, size)
      const chunk = await file.slice(offset, end).text()
      const sample = carry + chunk

      if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(sample)) {
        throw new FrontmatterParseError(
          "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
          path
        )
      }

      carry = sample.slice(-8)
    }

    return null
  } catch (error) {
    if (error instanceof FrontmatterParseError) {
      throw error
    }
    return null
  }
}

/**
 * Read and parse only a subset of frontmatter keys (strict).
 *
 * This reads incrementally until the frontmatter block is complete and then
 * parses only the keys you ask for. It preserves strict fence-position checks.
 */
export async function readFrontmatterPickStrict(
  path: string,
  keys: FrontmatterPickKeys,
  chunkSize = 8192,
  options?: FrontmatterParseOptions
): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path)
    const size = file.size
    if (size === 0) return null

    const firstReadSize = Math.min(chunkSize, size)
    const firstChunk = await file.slice(0, firstReadSize).text()

    const hasFrontmatterAtStart =
      firstChunk.startsWith("---\n") || firstChunk.startsWith("---\r\n")

    if (hasFrontmatterAtStart) {
      let content = firstChunk
      let offset = firstReadSize

      while (!/\r?\n---/.test(content)) {
        if (offset >= size) {
          throw new FrontmatterParseError("opening frontmatter fence is not closed", path)
        }

        const end = Math.min(offset + chunkSize, size)
        const nextChunk = await file.slice(offset, end).text()
        content += nextChunk
        offset = end
      }

      return parseFrontmatterPickStrict(content, keys, path, options)
    }

    if (firstChunk.startsWith("---")) {
      throw new FrontmatterParseError(
        "opening frontmatter fence must be followed by a newline",
        path
      )
    }

    let carry = firstChunk.slice(-8)
    if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(firstChunk)) {
      throw new FrontmatterParseError(
        "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
        path
      )
    }

    for (let offset = firstReadSize; offset < size; offset += chunkSize) {
      const end = Math.min(offset + chunkSize, size)
      const chunk = await file.slice(offset, end).text()
      const sample = carry + chunk

      if (FRONTMATTER_FENCE_ANYWHERE_REGEX.test(sample)) {
        throw new FrontmatterParseError(
          "frontmatter fence found after non-frontmatter content (frontmatter must start at byte 0)",
          path
        )
      }

      carry = sample.slice(-8)
    }

    return null
  } catch (error) {
    if (error instanceof FrontmatterParseError) {
      throw error
    }
    return null
  }
}

/**
 * Read frontmatter and return the offset where body starts.
 * Useful when you need both frontmatter and body.
 *
 * @param path - Path to the markdown file
 * @returns Object with frontmatter and body start offset
 */
export async function readFrontmatterWithOffset(
  path: string
): Promise<{ frontmatter: Record<string, unknown> | null; bodyOffset: number }> {
  try {
    const file = Bun.file(path)
    const content = await file.text()

    const frontmatter = parseFrontmatter(content)
    const bodyOffset = getFrontmatterEndOffset(content)

    return { frontmatter, bodyOffset }
  } catch {
    return { frontmatter: null, bodyOffset: 0 }
  }
}
