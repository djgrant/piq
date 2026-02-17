/**
 * piq v2 Select Type System
 *
 * Type-level machinery for dotted-string selects with collision detection.
 */

// =============================================================================
// SelectablePaths - Generate union of all valid dot-paths from namespaced type
// =============================================================================

/**
 * Extract all selectable dot-paths from a namespaced type.
 * Includes individual field paths and wildcard paths.
 *
 * @example
 * type Schema = {
 *   params: { slug: string; year: string }
 *   frontmatter: { title: string }
 * }
 * type Paths = SelectablePaths<Schema>
 * // = 'params.slug' | 'params.year' | 'frontmatter.title' | 'params.*' | 'frontmatter.*'
 */
export type SelectablePaths<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}.*` | { [F in keyof T[K] & string]: `${K}.${F}` }[keyof T[K] & string]
        : never
    }[keyof T & string]
  : never

// =============================================================================
// GetFieldName - Extract the last segment of a dot-path
// =============================================================================

/**
 * Extract the final field name from a dot-path.
 *
 * @example
 * type Name = GetFieldName<'params.slug'>  // 'slug'
 * type Name2 = GetFieldName<'frontmatter.title'>  // 'title'
 */
export type GetFieldName<S extends string> = S extends `${string}.${infer Field}` ? Field : S

// =============================================================================
// GetPathValue - Get the value type at a dot-path
// =============================================================================

/**
 * Get the value type at a specific dot-path in a namespaced type.
 *
 * @example
 * type V = GetPathValue<Schema, 'params.slug'>  // string
 * type V2 = GetPathValue<Schema, 'frontmatter.tags'>  // string[]
 */
export type GetPathValue<T, S extends string> = S extends `${infer NS}.${infer Field}`
  ? NS extends keyof T
    ? T[NS] extends object
      ? Field extends keyof T[NS]
        ? T[NS][Field]
        : never
      : never
    : never
  : never

// =============================================================================
// ExpandWildcard - Expand wildcard paths to all fields in namespace
// =============================================================================

/**
 * Expand a wildcard path to all individual field paths.
 * Non-wildcard paths pass through unchanged.
 *
 * @example
 * type Expanded = ExpandWildcard<Schema, 'params.*'>
 * // = 'params.slug' | 'params.year'
 */
export type ExpandWildcard<T, S extends string> = S extends `${infer NS}.*`
  ? NS extends keyof T
    ? T[NS] extends object
      ? { [F in keyof T[NS] & string]: `${NS}.${F}` }[keyof T[NS] & string]
      : never
    : never
  : S

// =============================================================================
// HasCollision - Detect duplicate final segments in path array
// =============================================================================

/**
 * Helper: Extract all field names from a tuple of paths.
 */
type ExtractFieldNames<Paths extends readonly string[]> = {
  [K in keyof Paths]: Paths[K] extends string ? GetFieldName<Paths[K]> : never
}[number]

/**
 * Helper: Check if a field name appears more than once.
 * Counts occurrences by filtering the tuple.
 */
type CountFieldName<
  Paths extends readonly string[],
  Field extends string
> = Paths extends readonly [infer Head, ...infer Tail extends string[]]
  ? GetFieldName<Head & string> extends Field
    ? [true, ...CountFieldName<Tail, Field>]
    : CountFieldName<Tail, Field>
  : []

/**
 * Helper: Check if count is greater than 1.
 */
type HasDuplicate<Count extends unknown[]> = Count extends [unknown, unknown, ...unknown[]]
  ? true
  : false

/**
 * Helper: Check any field for duplicates.
 */
type AnyFieldHasDuplicate<
  Paths extends readonly string[],
  Fields extends string = ExtractFieldNames<Paths>
> = Fields extends string
  ? HasDuplicate<CountFieldName<Paths, Fields>> extends true
    ? true
    : never
  : never

/**
 * Detect if any two paths in the array have the same final segment.
 *
 * @example
 * type C1 = HasCollision<['params.slug', 'frontmatter.title']>  // false
 * type C2 = HasCollision<['params.title', 'frontmatter.title']>  // true
 */
export type HasCollision<Paths extends readonly string[]> =
  true extends AnyFieldHasDuplicate<Paths> ? true : false

// =============================================================================
// Undot - Build flat result type from selected paths
// =============================================================================

/**
 * Build a flat object type from an array of selected paths.
 * Uses the final segment of each path as the property name.
 *
 * @example
 * type Result = Undot<Schema, ['params.slug', 'frontmatter.title']>
 * // = { slug: string; title: string }
 */
export type Undot<T, Paths extends readonly string[]> = {
  [P in Paths[number] as GetFieldName<P>]: GetPathValue<T, P>
}

// =============================================================================
// UndotWithAliases - Build result type with custom property names
// =============================================================================

/**
 * Build a flat object type using alias names as properties.
 *
 * @example
 * type Result = UndotWithAliases<Schema, { postSlug: 'params.slug'; postTitle: 'frontmatter.title' }>
 * // = { postSlug: string; postTitle: string }
 */
export type UndotWithAliases<T, Aliases extends Record<string, string>> = {
  [K in keyof Aliases]: Aliases[K] extends string ? GetPathValue<T, Aliases[K]> : never
}

// =============================================================================
// ExpandAllWildcards - Expand all wildcards in a path array
// =============================================================================

/**
 * Expand all wildcard paths in an array to their individual field paths.
 *
 * @example
 * type Expanded = ExpandAllWildcards<Schema, ['params.*', 'frontmatter.title']>
 * // = 'params.slug' | 'params.year' | 'frontmatter.title'
 */
export type ExpandAllWildcards<T, Paths extends readonly string[]> = {
  [K in keyof Paths]: ExpandWildcard<T, Paths[K] & string>
}[number]

// =============================================================================
// ValidateSelect - Ensures no collisions (for use in type constraints)
// =============================================================================

/**
 * Validate a select array has no collisions.
 * Returns the paths if valid, never if collision detected.
 */
export type ValidateSelect<Paths extends readonly string[]> = HasCollision<Paths> extends true
  ? never
  : Paths

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type {
  SelectablePaths as Paths,
  GetFieldName as FieldName,
  GetPathValue as PathValue,
  HasCollision as Collision,
  Undot as FlattenPaths,
  UndotWithAliases as FlattenAliases
}
