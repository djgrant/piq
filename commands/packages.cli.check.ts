import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Check cli package",
  run: async (r) => {
    await r.exec("pnpm exec tsc --noEmit", { cwd: "packages/cli" });
  },
});
