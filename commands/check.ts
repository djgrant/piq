import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Run workspace type checks",
  run: async (r) => {
    await r.group("Check workspace", { layout: "sequence" }, async (g) => {
      await g.activity("Check piqit package", async () => {
        await r.exec("pnpm exec tsc --noEmit", { cwd: "packages/piqit" });
      });

      await g.activity("Check resolvers package", async () => {
        await r.exec("pnpm exec tsc --noEmit", { cwd: "packages/resolvers" });
      });

      await g.activity("Check cli package", async () => {
        await r.exec("pnpm exec tsc --noEmit", { cwd: "packages/cli" });
      });
    });

    r.reporter.success("Workspace checks complete");
  },
});
