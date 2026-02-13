import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Start playground API server",
  run: async (r) => {
    await r.exec("bun run --hot src/server.ts", { cwd: "playground", interactive: true });
  },
});
