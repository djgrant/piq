import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Preview website build",
  run: async (r) => {
    await r.exec("pnpm exec astro preview", { cwd: "website", interactive: true });
  },
});
