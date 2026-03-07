import { defineChangesetEntry } from '@notation/looped'

export default defineChangesetEntry({
  schema: 'changeset.entry',
  date: '2026-03-07',
  slug: 'node-esm-packaging',
  title: 'Harden piq package artifacts for Node ESM consumers',
  summary: 'Switched published package internals to explicit .js specifiers, enforced NodeNext package builds, and added post-build artifact smoke imports.',
  packages: [
    {
      name: 'piq',
      changes: [
        'Updated piqit source imports/exports to emit Node-compatible .js specifiers in dist artifacts',
        'Updated @piqit/resolvers source imports/exports to emit Node-compatible .js specifiers in dist artifacts',
        'Set package-local TypeScript builds for piqit and resolvers to NodeNext so extensionless ESM regressions are caught at compile time',
        'Added a Node smoke script that imports each built package entrypoint after compilation',
        'Wired artifact smoke imports into the package and workspace build commands',
      ],
    },
  ],
  tasks: [
    { ref: 'TASK-2', title: 'Fix Node ESM packaging for piqit and @piqit/resolvers', status: 'done' },
  ],
  validation: [
    { scope: 'piqit', description: 'TypeScript compile', passed: true },
    { scope: '@piqit/resolvers', description: 'TypeScript compile', passed: true },
    { scope: 'artifacts', description: 'Node smoke imports for built dist entrypoints', passed: true },
    { scope: 'piq', description: 'bun test', passed: true },
  ],
  filesChanged: [
    'packages/piqit/src/index.ts',
    'packages/piqit/src/query.ts',
    'packages/piqit/src/types.ts',
    'packages/piqit/tsconfig.json',
    'packages/resolvers/src/index.ts',
    'packages/resolvers/src/file-markdown.ts',
    'packages/resolvers/src/edge.ts',
    'packages/resolvers/src/markdown.ts',
    'packages/resolvers/tsconfig.json',
    'commands/build.ts',
    'commands/packages.piqit.build.ts',
    'commands/packages.resolvers.build.ts',
    'scripts/smoke-node-esm-artifacts.mjs',
  ],
})
