/**
 * @piqit/cli - Configuration API for the piq CLI
 *
 * The CLI binary lives in cli.ts; this module exports the pieces a
 * piq.config.ts needs.
 */

export { defineConfig, findConfig, loadConfig } from "./config.js"
export type { PiqConfig, AnyResolver } from "./config.js"
