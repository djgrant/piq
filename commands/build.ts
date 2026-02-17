import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build workspace packages and sites",
  run: async (r) => {
    await r.group("Build workspace", { layout: "sequence" }, async (g) => {
      await g.activity("Build piqit package", async () => {
        await r.exec("pnpm exec tsc", { cwd: "packages/piqit" });
      });

      await g.activity("Build resolvers package", async () => {
        await r.exec("pnpm exec tsc", { cwd: "packages/resolvers" });
      });

      await g.activity("Build docs", async () => {
        await r.exec("pnpm exec vitepress build", { cwd: "docs" });
      });

      await g.activity("Build website", async () => {
        await r.exec("pnpm exec astro build", { cwd: "website" });
      });
    });

    r.reporter.success("Workspace build complete");
  },
});
