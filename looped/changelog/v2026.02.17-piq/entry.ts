import { defineChangelogEntry } from '@notation/looped'

export default defineChangelogEntry({
  schema: 'changelog.entry.v1',
  date: '2026-02-17',
  slug: 'piq',
  title: 'Constrained Path Token Parsing in Piq',
  summary: 'Added constrained token syntax for reliable filename parsing in piq resolvers.',
  packages: [
    {
      name: 'piq',
      changes: [
        'Constrained token syntax in path patterns (e.g. {num:\\d+})',
        'Reliable extraction when tokens and separators overlap',
      ],
    },
  ],
  tasks: [
    { ref: 'looped/TASK-019', title: 'Upstream piq: support constrained path token parsing or token transforms', status: 'done' },
  ],
  validation: [
    { scope: 'piq', description: 'Resolver tests for constrained token matching passing', passed: true },
  ],
  filesChanged: [
    'piq/packages/resolvers/src/path-pattern.ts',
    'piq/packages/resolvers/test/file-markdown.test.ts',
    'piq/packages/resolvers/package.json',
  ],
})
