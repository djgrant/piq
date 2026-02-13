import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build website",
  run: async (r) => {
    await r.exec("pnpm exec astro build", { cwd: "website" });
  },
});
