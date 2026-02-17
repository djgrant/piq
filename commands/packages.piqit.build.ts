import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build piqit package",
  run: async (r) => {
    await r.exec("pnpm exec tsc", { cwd: "packages/piqit" });
  },
});
