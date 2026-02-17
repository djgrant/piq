import { rm } from "node:fs/promises";
import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Clean build artifacts",
  run: async (r) => {
    await r.group("Clean workspace", { layout: "sequence" }, async (g) => {
      await g.activity("Remove package build outputs", async () => {
        await rm("packages/piqit/dist", { recursive: true, force: true });
        await rm("packages/resolvers/dist", { recursive: true, force: true });
      });

      await g.activity("Remove site output", async () => {
        await rm("dist", { recursive: true, force: true });
      });
    });

    r.reporter.success("Clean complete");
  },
});
