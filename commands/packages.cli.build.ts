import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build cli package",
  run: async (r) => {
    await r.exec("pnpm exec tsc", { cwd: "packages/cli" });
    await r.exec("node ./scripts/smoke-node-esm-artifacts.mjs cli");
  },
});
