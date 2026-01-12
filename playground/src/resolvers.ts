import { join } from "path";
import { z } from "zod";
import { fileMarkdown } from "@piqit/resolvers";

const contentDir = join(import.meta.dir, "../public/content");

// Define collections with Zod schemas
export const posts = fileMarkdown({
  base: join(contentDir, "posts"),
  path: "{year}/{slug}.md",
  frontmatter: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    author: z.string(),
  }),
  body: { html: true, headings: true, raw: true },
});

export const workPackages = fileMarkdown({
  base: join(contentDir, "work"),
  path: "{status}/wp-{priority}-{name}.md",
  frontmatter: z.object({
    category: z.string(),
    size: z.string(),
  }),
  body: { html: true, headings: true, raw: true },
});
