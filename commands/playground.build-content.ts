import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build playground static content",
  run: async (r) => {
    await r.exec("bun run scripts/build-content.ts", { cwd: "playground" });
  },
});
