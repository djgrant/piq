import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Preview docs build",
  run: async (r) => {
    await r.exec("pnpm exec vitepress preview", { cwd: "docs", interactive: true });
  },
});
