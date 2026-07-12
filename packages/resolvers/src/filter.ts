/**
 * Shared Filter Matching
 *
 * One predicate for all resolvers so filter semantics stay identical
 * across fileMarkdown, staticContent, and anything else.
 */

import type { FilterOperator } from "piqit"

function isFilterOperator(value: unknown): value is FilterOperator {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "contains" in value
  )
}

/**
 * Check a single field value against a filter constraint.
 *
 * Exact values compare with strict equality. { contains } substring-matches
 * string fields, and string-array fields when any element contains the
 * needle. Matching is case-sensitive.
 */
export function matchesConstraint(actual: unknown, constraint: unknown): boolean {
  if (isFilterOperator(constraint)) {
    const needle = constraint.contains
    if (typeof actual === "string") return actual.includes(needle)
    if (Array.isArray(actual)) {
      return actual.some((v) => typeof v === "string" && v.includes(needle))
    }
    return false
  }
  return actual === constraint
}

/**
 * Check a record against every constraint in a filter object.
 */
export function matchesFilter(
  record: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  for (const [key, constraint] of Object.entries(filter)) {
    if (!matchesConstraint(record[key], constraint)) {
      return false
    }
  }
  return true
}
