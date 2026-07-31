import { z } from "zod"
import { defineConfig } from "../../../src/config.ts"
import { fileMarkdown } from "../../../../resolvers/src/index.ts"

export default defineConfig({
  collections: {
    notes: fileMarkdown({
      base: "content",
      path: "{year}/{slug}.md",
      frontmatter: z.object({
        title: z.string(),
        status: z.enum(["draft", "published"]),
        priority: z.number(),
        summary: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
  },
})
