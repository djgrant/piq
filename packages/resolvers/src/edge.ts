/**
 * @piqit/resolvers/edge - Edge-compatible resolvers
 *
 * This entry point only exports resolvers that work in edge environments
 * like Cloudflare Workers, where dynamic code generation is not allowed.
 *
 * Use this instead of '@piqit/resolvers' in your Worker:
 *
 * @example
 * import { staticContent } from "@piqit/resolvers/edge";
 *
 * @packageDocumentation
 */

export { staticContent, staticResolver } from "./static"
