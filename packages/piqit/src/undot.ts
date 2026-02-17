/**
 * piq v2 Undotting Logic
 *
 * Runtime transformation of namespaced results to flat objects.
 */

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get a value from a nested object using a dot-path.
 *
 * @param obj - The source object
 * @param path - Dot-separated path like 'params.slug'
 * @returns The value at the path, or undefined
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Extract the final segment from a dot-path.
 *
 * @param path - Dot-separated path like 'params.slug'
 * @returns The final segment, e.g., 'slug'
 */
function getFieldName(path: string): string {
  const lastDot = path.lastIndexOf(".")
  return lastDot >= 0 ? path.slice(lastDot + 1) : path
}

/**
 * Extract the namespace (first segment) from a dot-path.
 *
 * @param path - Dot-separated path like 'params.slug'
 * @returns The namespace, e.g., 'params'
 */
function getNamespace(path: string): string {
  const firstDot = path.indexOf(".")
  return firstDot >= 0 ? path.slice(0, firstDot) : path
}

// =============================================================================
// Wildcard Expansion
// =============================================================================

/**
 * Expand wildcard paths to their actual field paths.
 *
 * @param paths - Array of paths, possibly containing wildcards like 'params.*'
 * @param namespaces - The namespaced result object to expand wildcards against
 * @returns Array of expanded paths with wildcards replaced by actual field paths
 *
 * @example
 * expandWildcards(['params.*', 'frontmatter.title'], {
 *   params: { slug: 'x', year: '2024' },
 *   frontmatter: { title: 'Hello' }
 * })
 * // Returns: ['params.slug', 'params.year', 'frontmatter.title']
 */
export function expandWildcards(
  paths: string[],
  namespaces: Record<string, unknown>
): string[] {
  const expanded: string[] = []

  for (const path of paths) {
    if (path.endsWith(".*")) {
      // Extract namespace and expand
      const ns = getNamespace(path)
      const nsValue = namespaces[ns]

      if (nsValue && typeof nsValue === "object" && nsValue !== null) {
        // Add all keys from this namespace
        for (const key of Object.keys(nsValue)) {
          expanded.push(`${ns}.${key}`)
        }
      }
    } else {
      // Regular path, keep as-is
      expanded.push(path)
    }
  }

  return expanded
}

// =============================================================================
// Undotting
// =============================================================================

/**
 * Transform a namespaced result to a flat object using selected paths.
 *
 * The final segment of each path becomes the property name in the result.
 *
 * @param namespacedResult - The source object with namespaced structure
 * @param selectPaths - Array of dot-paths to extract (may include wildcards)
 * @returns Flat object with field names as keys
 *
 * @example
 * undot(
 *   { params: { slug: 'hello' }, frontmatter: { title: 'World' } },
 *   ['params.slug', 'frontmatter.title']
 * )
 * // Returns: { slug: 'hello', title: 'World' }
 */
export function undot<T extends Record<string, unknown>>(
  namespacedResult: T,
  selectPaths: string[]
): Record<string, unknown> {
  // First expand any wildcards
  const expandedPaths = expandWildcards(selectPaths, namespacedResult)

  const result: Record<string, unknown> = {}

  for (const path of expandedPaths) {
    const fieldName = getFieldName(path)
    const value = getByPath(namespacedResult, path)
    result[fieldName] = value
  }

  return result
}

/**
 * Transform a namespaced result using aliased paths.
 *
 * The alias name becomes the property name in the result.
 *
 * @param namespacedResult - The source object with namespaced structure
 * @param aliases - Map of alias names to dot-paths
 * @returns Flat object with alias names as keys
 *
 * @example
 * undotWithAliases(
 *   { params: { slug: 'hello' }, frontmatter: { title: 'World' } },
 *   { mySlug: 'params.slug', myTitle: 'frontmatter.title' }
 * )
 * // Returns: { mySlug: 'hello', myTitle: 'World' }
 */
export function undotWithAliases<T extends Record<string, unknown>>(
  namespacedResult: T,
  aliases: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [alias, path] of Object.entries(aliases)) {
    // Handle wildcards in aliased paths (unusual but supported)
    if (path.endsWith(".*")) {
      const expandedPaths = expandWildcards([path], namespacedResult)
      for (const expandedPath of expandedPaths) {
        const fieldName = getFieldName(expandedPath)
        const value = getByPath(namespacedResult, expandedPath)
        // For wildcards in aliases, we use the field name since alias can't represent multiple
        result[fieldName] = value
      }
    } else {
      const value = getByPath(namespacedResult, path)
      result[alias] = value
    }
  }

  return result
}

/**
 * Transform an array of namespaced results to flat objects.
 *
 * @param results - Array of namespaced result objects
 * @param selectPaths - Array of dot-paths to extract
 * @returns Array of flat objects
 */
export function undotAll<T extends Record<string, unknown>>(
  results: T[],
  selectPaths: string[]
): Record<string, unknown>[] {
  return results.map((result) => undot(result, selectPaths))
}

/**
 * Transform an array of namespaced results using aliases.
 *
 * @param results - Array of namespaced result objects
 * @param aliases - Map of alias names to dot-paths
 * @returns Array of flat objects
 */
export function undotAllWithAliases<T extends Record<string, unknown>>(
  results: T[],
  aliases: Record<string, string>
): Record<string, unknown>[] {
  return results.map((result) => undotWithAliases(result, aliases))
}
