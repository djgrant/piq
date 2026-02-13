import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Start dev servers",
  run: async (r) => {
    await r.tabs(
      [
        r.exec("pnpm exec astro dev", { cwd: "website" }),
        r.exec("pnpm exec vitepress dev --port 5174", { cwd: "docs" }),
        r.exec("bun run --hot src/server.ts", { cwd: "playground" }),
      ],
      { name: "Development" },
    );
  },
});
