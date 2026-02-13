import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Run test suite",
  run: async (r) => {
    await r.exec("bun test");
    r.reporter.success("Tests complete");
  },
});
