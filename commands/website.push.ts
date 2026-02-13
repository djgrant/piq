import { defineCommand } from "@pokit/core";

export const command = defineCommand({
  label: "Deploy website dist to Cloudflare Pages",
  run: async (r) => {
    await r.group("Deploy website", { layout: "sequence" }, async (g) => {
      await g.activity("Build website", async () => {
        await r.exec("pnpm exec astro build", { cwd: "website" });
      });

      await g.activity("Deploy dist", async () => {
        await r.exec("pnpm exec wrangler pages deploy dist --project-name=piq-website", {
          cwd: "website",
        });
      });
    });

    r.reporter.success("Website deploy complete");
  },
});
