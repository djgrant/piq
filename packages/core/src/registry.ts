/**
 * piq v2 Resolver Registry
 *
 * Manages registration and lookup of resolvers by name.
 */

import type { Resolver, StandardSchema } from "./types"

// =============================================================================
// Global Registry
// =============================================================================

/**
 * Internal registry of resolvers by name.
 * Using Record<string, unknown> for flexibility since we lose type info at runtime.
 */
const resolvers: Record<string, Resolver<StandardSchema, StandardSchema, StandardSchema>> = {}

// =============================================================================
// Registry Interface
// =============================================================================

/**
 * A map from resolver names to their types.
 * This is extended by users via declaration merging.
 *
 * @example
 * declare module 'piqit' {
 *   interface Registry {
 *     posts: typeof postResolver
 *   }
 * }
 */
export interface Registry {}

// =============================================================================
// Registry Functions
// =============================================================================

/**
 * Register a resolver with a name.
 *
 * @param name - Unique identifier for the resolver
 * @param resolver - The resolver instance
 */
export function register<TName extends string>(
  name: TName,
  resolver: Resolver<StandardSchema, StandardSchema, StandardSchema>
): void {
  if (resolvers[name]) {
    throw new Error(`Resolver "${name}" is already registered`)
  }
  resolvers[name] = resolver
}

/**
 * Get a resolver by name.
 *
 * @param name - The resolver name
 * @returns The resolver instance
 * @throws If resolver is not found
 */
export function getResolver<TName extends keyof Registry>(
  name: TName
): Registry[TName]
export function getResolver(name: string): Resolver<StandardSchema, StandardSchema, StandardSchema>
export function getResolver(
  name: string
): Resolver<StandardSchema, StandardSchema, StandardSchema> {
  const resolver = resolvers[name]
  if (!resolver) {
    throw new Error(`Resolver "${name}" not found. Did you forget to register it?`)
  }
  return resolver
}

/**
 * Clear all registered resolvers.
 * Useful for testing.
 */
export function clearRegistry(): void {
  for (const key of Object.keys(resolvers)) {
    delete resolvers[key]
  }
}

/**
 * Check if a resolver is registered.
 *
 * @param name - The resolver name to check
 * @returns True if resolver exists
 */
export function hasResolver(name: string): boolean {
  return name in resolvers
}
