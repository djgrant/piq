::code-panels

```ts [collection.ts]
import { fileMarkdown } from "@piqit/resolvers";

const posts = fileMarkdown({
  base: "content/posts",
  path: "{year}/{slug}.md",
  frontmatter: z.object({
    title: z.string(),
    status: z.enum(["draft", "published"]),
  }),
  body: { html: true },
});
```

```ts [src/query.ts]
import { piq } from "piqit";

// Query: scan → filter → select
const results = await piq
  .from(posts)
  .scan({ year: "2024" })
  .filter({ status: "published" })
  .select("params.slug", "frontmatter.title", "body.html")
  .exec();

// Get first post data
const [{ slug, title, html }] = results;
```

::
