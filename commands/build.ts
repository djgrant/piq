import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Build workspace packages",
  run: async (r) => {
    await r.group("Build workspace", { layout: "sequence" }, async (g) => {
      await g.activity("Build piqit package", async () => {
        await r.exec("pnpm exec tsc", { cwd: "packages/piqit" });
      });

      await g.activity("Build resolvers package", async () => {
        await r.exec("pnpm exec tsc", { cwd: "packages/resolvers" });
      });

      await g.activity("Build cli package", async () => {
        await r.exec("pnpm exec tsc", { cwd: "packages/cli" });
      });

      await g.activity("Smoke test package artifacts", async () => {
        await r.exec("node ./scripts/smoke-node-esm-artifacts.mjs");
      });
    });

    r.reporter.success("Workspace build complete");
  },
});
