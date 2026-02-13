import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Start docs dev server",
  run: async (r) => {
    await r.exec("pnpm exec vitepress dev", { cwd: "docs", interactive: true });
  },
});
