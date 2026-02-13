import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build resolvers package",
  run: async (r) => {
    await r.exec("pnpm exec tsc", { cwd: "packages/resolvers" });
  },
});
