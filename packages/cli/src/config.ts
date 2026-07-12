/**
 * piq CLI Configuration
 *
 * Collections are declared in a piq.config.ts (or .js) at or above the
 * directory where `piq` runs. Bun imports TypeScript configs natively.
 */

import type { Resolver, StandardSchema } from "piqit"
import path from "node:path"
import { existsSync } from "node:fs"
import { pathToFileURL } from "node:url"

export type AnyResolver = Resolver<StandardSchema, StandardSchema, StandardSchema>

export interface PiqConfig {
  /** Named collections queryable via `piq <name>` */
  collections: Record<string, AnyResolver>
}

/**
 * Identity helper for typed piq.config.ts files.
 *
 * @example
 * export default defineConfig({
 *   collections: { posts: fileMarkdown({ ... }) },
 * })
 */
export function defineConfig(config: PiqConfig): PiqConfig {
  return config
}

const CONFIG_FILENAMES = ["piq.config.ts", "piq.config.js"]

/**
 * Walk up from a directory to find the nearest piq config file.
 *
 * @returns Absolute path to the config, or null if none found
 */
export function findConfig(startDir: string): string | null {
  let dir = path.resolve(startDir)
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = path.join(dir, filename)
      if (existsSync(candidate)) return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Load and validate a piq config file.
 *
 * @throws Error if the default export is not a config with collections
 */
export async function loadConfig(configPath: string): Promise<PiqConfig> {
  const mod = await import(pathToFileURL(configPath).href)
  const config = mod.default as PiqConfig | undefined
  if (!config || typeof config !== "object" || !config.collections) {
    throw new Error(
      `${configPath} must default-export a config with a 'collections' object (use defineConfig from @piqit/cli)`
    )
  }
  return config
}
