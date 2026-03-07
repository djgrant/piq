---
title: Fix Node ESM packaging for piqit and @piqit/resolvers
created: "2026-03-06T17:38:20.982Z"
updated: "2026-03-07T08:05:13.967Z"
priority: high
assignee: agent
estimate: medium
tags: [packaging, esm, runtime]
---
Node ESM consumers cannot import the built packages because the emitted dist uses extensionless relative specifiers like `./query` and `./file-markdown`.

Repro:
- `node --input-type=module -e "import('/Users/coder/Repos/ai/piq/packages/piqit/dist/index.js')"`
- `node --input-type=module -e "import('/Users/coder/Repos/ai/piq/packages/resolvers/dist/index.js')"`

Both fail with `Cannot find module ...` under plain Node ESM. This breaks downstream consumers like looped and Smithers when they load the packaged artifacts. Fix the emitted imports to be Node-compatible and add an artifact-level smoke test that imports the dist entrypoints after build.