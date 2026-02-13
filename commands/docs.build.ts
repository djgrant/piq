import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build docs site",
  run: async (r) => {
    await r.exec("pnpm exec vitepress build", { cwd: "docs" });
  },
});
