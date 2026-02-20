import { fileMarkdown } from '@piqit/resolvers'
import { z } from 'zod'

const taskResolver = fileMarkdown({
  base: 'work',
  path: 'tasks/{status}/TASK-{num:\\d+}-{slug}.md',
  frontmatter: z.object({ title: z.string() }),
  body: { raw: true },
})

export default taskResolver
