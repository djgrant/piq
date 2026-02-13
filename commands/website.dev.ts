import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Start website dev server",
  run: async (r) => {
    await r.exec("pnpm exec astro dev", { cwd: "website", interactive: true });
  },
});
