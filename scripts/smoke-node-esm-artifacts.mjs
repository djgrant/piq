import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const entrypointsByTarget = {
  piqit: ["packages/piqit/dist/index.js"],
  resolvers: [
    "packages/resolvers/dist/index.js",
    "packages/resolvers/dist/edge.js",
    "packages/resolvers/dist/static.js",
  ],
  cli: ["packages/cli/dist/index.js"],
}

const requestedTargets = process.argv.slice(2)
const targets = requestedTargets.length > 0
  ? requestedTargets
  : Object.keys(entrypointsByTarget)

for (const target of targets) {
  const entrypoints = entrypointsByTarget[target]
  if (!entrypoints) {
    throw new Error(`Unknown smoke target: ${target}`)
  }

  for (const relativeEntrypoint of entrypoints) {
    const entrypoint = path.join(repoRoot, relativeEntrypoint)
    await import(pathToFileURL(entrypoint).href)
    console.log(`Imported ${relativeEntrypoint}`)
  }
}
