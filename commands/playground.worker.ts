import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Run playground worker entry",
  run: async (r) => {
    await r.exec("bun run src/worker.ts", { cwd: "playground", interactive: true });
  },
});
