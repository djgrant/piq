/**
 * Type-level compatibility tests for StandardSchema interop.
 */

import { z } from "zod"
import type { StandardSchema } from "./types"

declare function acceptsStandardSchema<T>(schema: StandardSchema<T>): void

const zodSchema = z.object({
  title: z.string(),
  done: z.boolean(),
})

acceptsStandardSchema(zodSchema)
